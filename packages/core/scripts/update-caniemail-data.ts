/**
 * Fetches the latest caniemail.com API data and regenerates
 * `packages/core/src/validate/caniemail-data.json`.
 *
 * Usage:
 *   bun run packages/core/scripts/update-caniemail-data.ts
 *   # or, after adding the package script:
 *   nr update-caniemail
 */

import { createHash } from 'node:crypto'
import { writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

import {
  ALWAYS_BLOCKED_TAGS,
  CANIEMAIL_FEATURE_MAP,
  EMAIL_CLIENT_PLATFORMS,
  classifyRatio,
  computeSupportRatio,
  type CaniemailApiData,
  type CaniemailDataFile,
  type CaniemailFeature,
  type ClientDataEntry,
  type ClientStatus,
  type EmailClient,
  type ValidationTables,
} from '../src/validate/caniemail'

const API_URL = 'https://www.caniemail.com/api/data.json'
const OUTPUT_PATH = resolve(import.meta.dirname, '../src/validate/caniemail-data.json')

const isValidFeature = (value: unknown): value is CaniemailFeature => {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const entries = Object.entries(value)
  const getValue = (key: string): unknown => {
    const entry = entries.find(([entryKey]) => entryKey === key)
    return entry?.[1]
  }

  return (
    typeof getValue('slug') === 'string' &&
    typeof getValue('url') === 'string' &&
    typeof getValue('stats') === 'object' &&
    getValue('stats') !== null
  )
}

const isCaniemailApiData = (value: unknown): value is CaniemailApiData => {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const entries = Object.entries(value)
  const getValue = (key: string): unknown => {
    const entry = entries.find(([entryKey]) => entryKey === key)
    return entry?.[1]
  }

  if (
    typeof getValue('api_version') !== 'string' ||
    typeof getValue('last_update_date') !== 'string'
  ) {
    return false
  }

  const data = getValue('data')
  if (!Array.isArray(data)) {
    return false
  }

  return data.every(isValidFeature)
}

const fetchApiData = async (): Promise<CaniemailApiData> => {
  const response = await fetch(API_URL)
  if (!response.ok) {
    throw new Error(`Failed to fetch caniemail data: ${response.status} ${response.statusText}`)
  }

  const data = (await response.json()) as unknown
  if (!isCaniemailApiData(data)) {
    throw new Error('Invalid caniemail API response structure')
  }

  return data
}

const buildFeatureMap = (apiData: CaniemailApiData): Record<string, CaniemailFeature> => {
  const map: Record<string, CaniemailFeature> = {}
  for (const feature of apiData.data) {
    map[feature.slug] = feature
  }

  return map
}

const generateDataFile = (apiData: CaniemailApiData): CaniemailDataFile => {
  const featureMap = buildFeatureMap(apiData)
  const tables: ValidationTables = {
    disallowedTags: {},
    warningTags: {},
    disallowedDeclarations: {},
    warningDeclarations: {},
    disallowedProperties: {},
    warningProperties: {},
    disallowedAtRules: {},
    warningAtRules: {},
  }

  for (const entry of CANIEMAIL_FEATURE_MAP) {
    const feature = featureMap[entry.slug]
    if (feature === undefined) {
      console.warn(`Skipping unknown caniemail slug: ${entry.slug}`)
      continue
    }

    const ratio = computeSupportRatio(feature.stats)
    const status = classifyRatio(ratio)

    if (status === 'supported') {
      continue
    }

    const { key, kind } = entry
    const url = feature.url

    if (kind === 'html-tag') {
      if (ALWAYS_BLOCKED_TAGS.has(key)) {
        continue
      }

      const message =
        status === 'unsupported'
          ? `The <${key}> tag isn't supported in HTML email strict mode.`
          : `The <${key}> tag has limited support in HTML email strict mode.`

      if (status === 'unsupported') {
        tables.disallowedTags[key] = { message, url }
      } else {
        tables.warningTags[key] = { message, url }
      }
    } else if (kind === 'css-declaration') {
      const message =
        status === 'unsupported'
          ? `The CSS property '${key}' isn't supported in HTML email strict mode.`
          : `The CSS property '${key}' may not be supported consistently in HTML email strict mode.`

      if (status === 'unsupported') {
        tables.disallowedDeclarations[key] = { message, url }
      } else {
        tables.warningDeclarations[key] = { message, url }
      }
    } else if (kind === 'css-property') {
      const message =
        status === 'unsupported'
          ? `The CSS property '${key}' isn't supported in HTML email strict mode.`
          : `The CSS property '${key}' has inconsistent support in HTML email strict mode.`

      if (status === 'unsupported') {
        tables.disallowedProperties[key] = { message, url }
      } else {
        tables.warningProperties[key] = { message, url }
      }
    } else if (kind === 'css-at-rule') {
      const message =
        status === 'unsupported'
          ? `The CSS at-rule '${key}' isn't supported reliably in HTML email strict mode.`
          : `The CSS at-rule '${key}' has limited support in HTML email strict mode.`

      if (status === 'unsupported') {
        tables.disallowedAtRules[key] = { message, url }
      } else {
        tables.warningAtRules[key] = { message, url }
      }
    }
    // html-attribute and image-format: not validated in html.ts
  }

  const clientData = buildClientData(featureMap)

  const deterministicContent = JSON.stringify({
    apiVersion: apiData.api_version,
    lastUpdateDate: apiData.last_update_date,
    tables,
    clientData,
  })
  const contentHash = createHash('sha256').update(deterministicContent).digest('hex')

  return {
    apiVersion: apiData.api_version,
    lastUpdateDate: apiData.last_update_date,
    contentHash,
    tables,
    clientData,
  }
}

const buildClientData = (
  featureMap: Record<string, CaniemailFeature>,
): Record<string, ClientDataEntry> => {
  const result: Record<string, ClientDataEntry> = {}

  for (const entry of CANIEMAIL_FEATURE_MAP) {
    if (entry.kind === 'html-attribute' || entry.kind === 'image-format') {
      continue
    }

    const feature = featureMap[entry.slug]
    if (feature === undefined) {
      continue
    }

    const clients: Partial<Record<EmailClient, ClientStatus>> = {}

    for (const [clientName, { client, platform }] of Object.entries(EMAIL_CLIENT_PLATFORMS) as [
      EmailClient,
      { client: string; platform: string },
    ][]) {
      const platformData = feature.stats[client]?.[platform]
      if (!platformData) {
        continue
      }

      const latestKey = Object.keys(platformData).sort((a, b) =>
        a.localeCompare(b, undefined, { numeric: true }),
      ).at(-1)
      if (latestKey === undefined) {
        continue
      }

      const raw = platformData[latestKey]
      if (raw === undefined) {
        continue
      }

      const base = raw.split('#')[0]?.trim().split(/\s+/)[0]?.toLowerCase()
      if (base === 'y') clients[clientName] = 'y'
      else if (base === 'a') clients[clientName] = 'a'
      else if (base === 'n') clients[clientName] = 'n'
    }

    // Only include features where at least one tracked client has non-full support
    if (Object.values(clients).some((s) => s !== 'y')) {
      result[`${entry.kind}:${entry.key}`] = { url: feature.url, ...clients }
    }
  }

  return result
}

const countEntries = (tables: ValidationTables): number =>
  Object.values(tables).reduce((sum, table) => sum + Object.keys(table).length, 0)

const main = async (): Promise<void> => {
  console.log(`Fetching ${API_URL}...`)
  const apiData = await fetchApiData()
  console.log(
    `Fetched caniemail API ${apiData.api_version} (last update: ${apiData.last_update_date}).`,
  )

  const dataFile = generateDataFile(apiData)
  const json = `${JSON.stringify(dataFile, null, 2)}\n`
  await writeFile(OUTPUT_PATH, json, 'utf8')

  console.log(`Wrote ${countEntries(dataFile.tables)} validation entries to ${OUTPUT_PATH}.`)
}

main().catch((error: unknown) => {
  console.error(error)
  process.exit(1)
})

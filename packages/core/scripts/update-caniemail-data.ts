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
  CANIEMAIL_FEATURE_MAP,
  classifyRatio,
  computeSupportRatio,
  type CaniemailApiData,
  type CaniemailDataFile,
  type CaniemailFeature,
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
  const features: CaniemailDataFile['features'] = {}

  for (const entry of CANIEMAIL_FEATURE_MAP) {
    const feature = featureMap[entry.slug]
    if (feature === undefined) {
      console.warn(`Skipping unknown caniemail slug: ${entry.slug}`)
      continue
    }

    const ratio = computeSupportRatio(feature.stats)
    const namespacedKey = `${entry.kind}:${entry.key}`
    features[namespacedKey] = {
      slug: entry.slug,
      kind: entry.kind,
      ratio,
      status: classifyRatio(ratio),
      url: feature.url,
    }
  }

  const deterministicContent = JSON.stringify({
    apiVersion: apiData.api_version,
    lastUpdateDate: apiData.last_update_date,
    features,
  })
  const contentHash = createHash('sha256').update(deterministicContent).digest('hex')

  return {
    apiVersion: apiData.api_version,
    lastUpdateDate: apiData.last_update_date,
    contentHash,
    features,
  }
}

const main = async (): Promise<void> => {
  console.log(`Fetching ${API_URL}...`)
  const apiData = await fetchApiData()
  console.log(
    `Fetched caniemail API ${apiData.api_version} (last update: ${apiData.last_update_date}).`,
  )

  const dataFile = generateDataFile(apiData)
  const json = `${JSON.stringify(dataFile, null, 2)}\n`
  await writeFile(OUTPUT_PATH, json, 'utf8')

  console.log(`Wrote ${Object.keys(dataFile.features).length} features to ${OUTPUT_PATH}.`)
}

main().catch((error: unknown) => {
  console.error(error)
  process.exit(1)
})

/** @jsxImportSource hono/jsx/dom */

type TemplateSummary = { name: string }

export type TemplateListProps = {
  templates: TemplateSummary[]
  selected: string | null
  onSelect: (name: string) => void
}

export function TemplateList({ templates, selected, onSelect }: TemplateListProps) {
  return (
    <div class="template-list">
      {templates.map((template) => (
        <button
          key={template.name}
          class={'template-item' + (template.name === selected ? ' active' : '')}
          onClick={() => onSelect(template.name)}
        >
          {template.name}
        </button>
      ))}
    </div>
  )
}

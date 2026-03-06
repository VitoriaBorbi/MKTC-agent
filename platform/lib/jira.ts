const JIRA_BASE   = process.env.JIRA_BASE_URL   ?? 'https://timeprimo.atlassian.net'
const JIRA_EMAIL  = process.env.JIRA_EMAIL       ?? ''
const JIRA_TOKEN  = process.env.JIRA_API_TOKEN   ?? ''
const JIRA_PROJECT = process.env.JIRA_PROJECT_KEY ?? 'SAL'

function authHeader() {
  const b64 = Buffer.from(`${JIRA_EMAIL}:${JIRA_TOKEN}`).toString('base64')
  return { Authorization: `Basic ${b64}`, 'Content-Type': 'application/json', Accept: 'application/json' }
}

// Maps platform status → Jira transition ID
const STATUS_TRANSITION: Record<string, string> = {
  em_andamento: '151', // In Progress
  aceita:       '151', // In Progress
  concluida:    '131', // Done
  recusada:     '61',  // Declined
  cancelada:    '71',  // Cancelled
}

// Maps platform priority → Jira priority name
const PRIORITY_MAP: Record<string, string> = {
  Alta:  'High',
  Media: 'Medium',
  Baixa: 'Low',
}

export interface JiraTaskData {
  protocol:        string
  title:           string
  type:            string
  bu:              string
  bu_subdivision?: string | null
  description?:    string | null
  links?:          string[]
  requester_name:  string
  requester_email: string
  requested_deadline?: string | null
  urgency_level?:  number | null
  priority_label:  string
}

function buildDescription(task: JiraTaskData): object {
  const lines: { type: string; content: { type: string; text: string }[] }[] = []

  const add = (label: string, value: string | null | undefined) => {
    if (!value) return
    lines.push({
      type: 'paragraph',
      content: [
        { type: 'text', text: `${label}: `, marks: [{ type: 'strong' }] } as never,
        { type: 'text', text: value },
      ],
    })
  }

  add('Protocolo', task.protocol)
  add('Tipo',      task.type)
  add('BU',        task.bu + (task.bu_subdivision ? ` / ${task.bu_subdivision}` : ''))
  add('Solicitante', `${task.requester_name} (${task.requester_email})`)
  add('Prazo solicitado', task.requested_deadline ?? null)
  add('Nível de urgência', task.urgency_level != null ? String(task.urgency_level) + '/5' : null)

  if (task.description) {
    lines.push({ type: 'paragraph', content: [{ type: 'text', text: '' }] })
    lines.push({
      type: 'paragraph',
      content: [
        { type: 'text', text: 'Descrição:', marks: [{ type: 'strong' }] } as never,
      ],
    })
    lines.push({ type: 'paragraph', content: [{ type: 'text', text: task.description }] })
  }

  if (task.links?.length) {
    lines.push({
      type: 'paragraph',
      content: [{ type: 'text', text: 'Links:', marks: [{ type: 'strong' }] } as never],
    })
    for (const link of task.links) {
      lines.push({ type: 'paragraph', content: [{ type: 'text', text: link }] })
    }
  }

  return { type: 'doc', version: 1, content: lines }
}

export async function createJiraIssue(task: JiraTaskData): Promise<string | null> {
  if (!JIRA_EMAIL || !JIRA_TOKEN) return null

  const body = {
    fields: {
      project:   { key: JIRA_PROJECT },
      issuetype: { name: 'Tarefa' },
      summary:   `[${task.protocol}] ${task.title}`,
      description: buildDescription(task),
      priority:  { name: PRIORITY_MAP[task.priority_label] ?? 'Medium' },
      'customfield_10183': task.requester_name, // Nome do solicitante (text)
      labels: [task.bu, task.type, 'mktc-platform'].filter(Boolean),
    },
  }

  const res = await fetch(`${JIRA_BASE}/rest/api/3/issue`, {
    method: 'POST',
    headers: authHeader(),
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const text = await res.text()
    console.error('[jira] createIssue failed', res.status, text.slice(0, 300))
    return null
  }

  const data = await res.json()
  return data.key as string // e.g. "SAL-5352"
}

export async function transitionJiraIssue(jiraKey: string, platformStatus: string): Promise<void> {
  const transitionId = STATUS_TRANSITION[platformStatus]
  if (!transitionId || !JIRA_EMAIL || !JIRA_TOKEN || !jiraKey) return

  const res = await fetch(`${JIRA_BASE}/rest/api/3/issue/${jiraKey}/transitions`, {
    method: 'POST',
    headers: authHeader(),
    body: JSON.stringify({ transition: { id: transitionId } }),
  })

  if (!res.ok) {
    const text = await res.text()
    console.error('[jira] transition failed', jiraKey, platformStatus, res.status, text.slice(0, 200))
  }
}

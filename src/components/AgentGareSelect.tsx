import { ALL_GARES, type AgentGareScope } from '../hooks/useAgentGareScope'
import { Select } from './ui/Field'

/** Choix du périmètre d'un agent qui gère plusieurs gares. */
export function AgentGareSelect({ gare, className = '' }: { gare: AgentGareScope; className?: string }) {
  if (!gare.canChoose) return null
  return (
    <Select value={gare.scope} onChange={(e) => gare.setScope(e.target.value)} className={className}>
      <option value={ALL_GARES}>Toutes mes gares</option>
      {gare.companies.map((c) => (
        <option key={c.id} value={c.id}>
          {c.name}
        </option>
      ))}
    </Select>
  )
}

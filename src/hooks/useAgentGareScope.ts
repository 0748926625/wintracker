import { useMemo, useState } from 'react'
import { useGare } from './useGare'

export const ALL_GARES = 'ALL'

/**
 * Périmètre de consultation d'un agent (Dashboard, Colis) : sa gare active par
 * défaut, une autre de ses gares, ou toutes à la fois. La gare active de useGare
 * reste celle utilisée pour enregistrer les colis.
 */
export function useAgentGareScope() {
  const { companies, activeCompanyId } = useGare()
  const [scope, setScope] = useState<string>(activeCompanyId ?? ALL_GARES)
  const companyIds = useMemo(
    () => (scope === ALL_GARES ? companies.map((c) => c.id) : [scope]),
    [scope, companies],
  )
  return { scope, setScope, companies, companyIds, canChoose: companies.length > 1 }
}

export type AgentGareScope = ReturnType<typeof useAgentGareScope>

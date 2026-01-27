import { policyTemplates as templatesData, type PolicyTemplate } from '../authorization/policy-templates.js'

export type { PolicyTemplate }

let cachedTemplates: PolicyTemplate[] | null = null

export function loadPolicyTemplates(): PolicyTemplate[] {
  if (cachedTemplates) {
    return cachedTemplates
  }

  try {
    cachedTemplates = templatesData
    console.log(`[POLICY TEMPLATES] Loaded ${cachedTemplates.length} policy templates`)
    return cachedTemplates
  } catch (error: any) {
    console.error('[POLICY TEMPLATES] Failed to load templates:', error.message)
    return []
  }
}

export function getPolicyTemplates(): PolicyTemplate[] {
  return loadPolicyTemplates()
}

export function getPolicyTemplateById(id: string): PolicyTemplate | null {
  const templates = getPolicyTemplates()
  return templates.find(t => t.id === id) || null
}

export function getPolicyTemplatesByCategory(category: string): PolicyTemplate[] {
  const templates = getPolicyTemplates()
  return templates.filter(t => t.category === category)
}

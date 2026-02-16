import { ref } from 'vue'
import { useAuth } from './useAuth'
import { useConfigStore } from '~/stores/config'

export function useApi() {
    const { getAuthHeader } = useAuth()
    const configStore = useConfigStore()

    const loading = ref(false)
    const error = ref<string | null>(null)


    const sessionId = ref(Math.random().toString(36).substring(2, 7))

    const generateId = () => {
        return Math.random().toString(36).substring(2, 7)
    }

    const apiCall = async <T>(
        endpoint: string,
        options: {
            method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
            body?: any
            headers?: Record<string, string>
            query?: Record<string, any>
        } = {}
    ): Promise<T> => {
        loading.value = true
        error.value = null

        try {
            const authHeader = getAuthHeader()
            if (!authHeader) {
                const errorMsg = 'Not authenticated. Please login.'
                error.value = errorMsg

                if (process.client) {
                    const { useAuth } = await import('./useAuth')
                    const { logout } = useAuth()
                    await logout()
                    await navigateTo('/login')
                }

                throw new Error(errorMsg)
            }

            const config = useRuntimeConfig()


            const baseUrl = config.public.backendUrl ?? ''

            const headers: Record<string, string> = {
                'Content-Type': 'application/json',
                'Authorization': authHeader,
                'x-project-id': configStore.projectId,
                'x-op-id': generateId(),
                'x-session-id': sessionId.value,
                ...options.headers
            }

            const url = `${baseUrl}${endpoint}`

            const response = await $fetch<T>(url, {
                method: options.method || 'GET',
                headers,
                body: options.body,
                query: options.query
            })

            return response
        } catch (e: any) {
            const errorMsg = e.data?.message || e.message || 'API request failed'
            error.value = errorMsg

            if (process.client) {
                if (e.status === 401 || e.statusCode === 401 || errorMsg.includes('Not authenticated') || errorMsg.includes('401')) {
                    try {
                        const { useAuth } = await import('./useAuth')
                        const { logout } = useAuth()
                        await logout()
                        await navigateTo('/login')
                    } catch {

                    }
                }
            }

            throw new Error(errorMsg)
        } finally {
            loading.value = false
        }
    }

    return {
        apiCall,
        loading,
        error
    }
}

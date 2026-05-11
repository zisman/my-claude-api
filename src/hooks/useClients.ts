import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getClients, getClient, createClient, updateClient, archiveClient } from '@/lib/api/clients'
import type { CreateClientForm } from '@/types'
import { useAuth } from './useAuth'

export function useClients() {
  return useQuery({ queryKey: ['clients'], queryFn: getClients, staleTime: 60_000 })
}

export function useClient(id: string) {
  return useQuery({ queryKey: ['clients', id], queryFn: () => getClient(id), enabled: !!id })
}

export function useCreateClient() {
  const qc = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: (form: CreateClientForm) => {
      if (!user?.organization_id) throw new Error('Not authenticated')
      return createClient({ ...form, organization_id: user.organization_id })
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['clients'] }),
  })
}

export function useUpdateClient() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<CreateClientForm> }) =>
      updateClient(id, updates),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['clients'] })
      qc.invalidateQueries({ queryKey: ['clients', id] })
    },
  })
}

export function useArchiveClient() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: archiveClient,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['clients'] }),
  })
}

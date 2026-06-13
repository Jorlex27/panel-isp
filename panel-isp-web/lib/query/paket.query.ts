import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    createPaket,
    deletePaket,
    listPaket,
    updatePaket,
    type CreatePaketInput,
} from '@/lib/api/paket.api';

export function useListPaket() {
    return useQuery({ queryKey: ['paket'], queryFn: listPaket });
}

export function useCreatePaket() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (input: CreatePaketInput) => createPaket(input),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['paket'] }),
    });
}

export function useUpdatePaket() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, input }: { id: string; input: Partial<CreatePaketInput> }) =>
            updatePaket(id, input),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['paket'] }),
    });
}

export function useDeletePaket() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => deletePaket(id),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['paket'] }),
    });
}

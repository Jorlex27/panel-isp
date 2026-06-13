import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { PelangganFilter } from '@/lib/types';
import {
    aktifkanPelanggan,
    bayarPelanggan,
    createPelanggan,
    deletePelanggan,
    gantiMacPelanggan,
    gantiPaket,
    getPelanggan,
    listPelanggan,
    suspendPelanggan,
    updatePelangganInfo,
    type BayarInput,
    type CreatePelangganInput,
    type GantiPaketInput,
    type UpdateInfoInput,
} from '@/lib/api/pelanggan.api';

export function useListPelanggan(filter: PelangganFilter = {}) {
    return useQuery({
        queryKey: ['pelanggan', filter],
        queryFn: () => listPelanggan(filter),
        placeholderData: keepPreviousData,
    });
}

export function useGetPelanggan(id: string) {
    return useQuery({ queryKey: ['pelanggan', id], queryFn: () => getPelanggan(id) });
}

export function useCreatePelanggan() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (input: CreatePelangganInput) => createPelanggan(input),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['pelanggan'] }),
    });
}

export function useSuspend() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => suspendPelanggan(id),
        onSuccess: (_, id) => qc.invalidateQueries({ queryKey: ['pelanggan', id] }),
    });
}

export function useAktifkan() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => aktifkanPelanggan(id),
        onSuccess: (_, id) => qc.invalidateQueries({ queryKey: ['pelanggan', id] }),
    });
}

export function useBayar() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, input }: { id: string; input: BayarInput }) =>
            bayarPelanggan(id, input),
        onSuccess: (_, { id }) => {
            qc.invalidateQueries({ queryKey: ['pelanggan', id] });
            qc.invalidateQueries({ queryKey: ['dashboard-summary'] });
        },
    });
}

export function useGantiPaket() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, input }: { id: string; input: GantiPaketInput }) =>
            gantiPaket(id, input),
        onSuccess: (_, { id }) => qc.invalidateQueries({ queryKey: ['pelanggan', id] }),
    });
}

export function useDeletePelanggan() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => deletePelanggan(id),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['pelanggan'] }),
    });
}

export function useUpdatePelangganInfo() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, input }: { id: string; input: UpdateInfoInput }) =>
            updatePelangganInfo(id, input),
        onSuccess: (_, { id }) => qc.invalidateQueries({ queryKey: ['pelanggan', id] }),
    });
}

export function useGantiMac() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, macAddress }: { id: string; macAddress: string }) =>
            gantiMacPelanggan(id, macAddress),
        onSuccess: (_, { id }) => qc.invalidateQueries({ queryKey: ['pelanggan', id] }),
    });
}

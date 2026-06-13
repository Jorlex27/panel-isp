import { useQuery } from '@tanstack/react-query';
import { listLangganan } from '@/lib/api/langganan.api';

export function useListLangganan() {
    return useQuery({ queryKey: ['langganan'], queryFn: listLangganan });
}

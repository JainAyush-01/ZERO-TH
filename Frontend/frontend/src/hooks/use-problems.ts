import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";

interface Filters {
    page: number;
    search: string;
    difficulty: string;
    category: string;
    enabled?: boolean; // <--- ADD THIS OPTIONAL PROP
}

export const useProblems = (filters: Filters) => {
    return useQuery({
        queryKey: ['problems', filters.page, filters.search, filters.difficulty, filters.category],
        queryFn: async () => {
            const { data } = await api.get(
                `/problem/fetchAllProblem?page=${filters.page}&search=${filters.search}&difficulty=${filters.difficulty}&category=${filters.category}`
            );
            return data;
        },
        placeholderData: (previousData) => previousData,
        enabled: filters.enabled, 
        retry: 1
    });
};
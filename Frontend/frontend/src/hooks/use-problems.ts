import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";

interface Filters {
    page: number;
    search: string;
    difficulty: string;
    category: string;
}

export const useProblems = (filters: Filters) => {
    return useQuery({
        // The query key includes all filters so it refetches when they change
        queryKey: ['problems', filters.page, filters.search, filters.difficulty, filters.category],
        queryFn: async () => {
            const { data } = await api.get(
                `/problem/fetchAllProblem?page=${filters.page}&search=${filters.search}&difficulty=${filters.difficulty}&category=${filters.category}`
            );
            return data; // Returns { problems: [], pagination: {} }
        },
        placeholderData: (previousData) => previousData, // Keeps old data visible while fetching new
    });
};
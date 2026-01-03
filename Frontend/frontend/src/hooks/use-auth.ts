import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";

interface User {
  _id: string;
  firstName: string;
  emailId: string;
  role: "user" | "admin";
  problemSolved: string[];
} 

export const useAuth = () => {
  return useQuery({
    queryKey: ["auth-user"],
    queryFn: async () => {
      try {
        const { data } = await api.get("/user/me");
        return data;
      } catch (error) {
        return null;
      }
    },
    retry: false,
    refetchOnWindowFocus: true, // Check when user clicks the window
  });
};
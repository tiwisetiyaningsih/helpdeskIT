import { apiFetch } from "@/lib/apiFetch";
import { API_URL } from "@/lib/config";

export async function assignTicket(ticketId: number) {
  const response = await apiFetch(
    `${API_URL}/tickets/${ticketId}/assign`,
    {
      method: "PATCH",
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message);
  }

  return data.ticket;
}
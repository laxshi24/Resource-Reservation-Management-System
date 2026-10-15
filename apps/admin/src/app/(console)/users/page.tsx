import { PageHeader } from "@rrms/web/components/layout/PageHeader";
import { DataTable } from "@rrms/web/components/shared/DataTable";
import { EmptyState } from "@rrms/web/components/shared/EmptyState";
import { Pagination } from "@rrms/web/components/shared/Pagination";
import { Badge } from "@rrms/web/components/ui/badge";
import { usersApi } from "@rrms/web/features/users/api";
import { formatDate } from "@rrms/web/lib/format-date";
import { getEnumParam, getPageParam, getParam, type RawSearchParams } from "@rrms/web/lib/search-params";
import { Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { UserFilters } from "@/components/users/UserFilters";

export const metadata: Metadata = { title: "Users" };

export default async function UsersPage({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  const params = await searchParams;
  const query = {
    search: getParam(params, "search")?.slice(0, 100),
    role: getEnumParam(params, "role", ["USER", "ADMIN", "all"] as const, "all"),
    page: getPageParam(params),
    pageSize: 15,
  };
  const { data } = await usersApi.list(query);

  return (
    <>
      <PageHeader title="Users" description="Accounts that can log in to the user and admin websites." />
      <UserFilters />
      {data.items.length === 0 ? (
        <EmptyState icon={Users} title="No users found" description="Try a different search or role filter." />
      ) : (
        <>
          <DataTable
            caption="Users"
            rows={data.items}
            getRowKey={(user) => user.id}
            columns={[
              {
                key: "name",
                header: "Name",
                cell: (user) => (
                  <div>
                    <p className="font-medium">{user.name}</p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                  </div>
                ),
              },
              {
                key: "role",
                header: "Role",
                cell: (user) => (
                  <Badge variant={user.role === "ADMIN" ? "default" : "secondary"}>
                    {user.role === "ADMIN" ? "Admin" : "User"}
                  </Badge>
                ),
              },
              {
                key: "reservations",
                header: "Reservations",
                className: "text-right",
                cell: (user) =>
                  user.reservationCount > 0 ? (
                    <Link href={`/reservations?search=${encodeURIComponent(user.name)}&timeframe=all`} className="hover:underline">
                      {user.reservationCount}
                    </Link>
                  ) : (
                    <span className="text-muted-foreground">0</span>
                  ),
              },
              { key: "joined", header: "Joined", cell: (user) => formatDate(user.createdAt) },
            ]}
          />
          <Pagination pagination={data.pagination} itemLabel="users" />
        </>
      )}
    </>
  );
}

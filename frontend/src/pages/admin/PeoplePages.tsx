import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { buildingsApi, downloadExport, flatsApi, residentsApi } from "@/api/resources";
import { PageHeader } from "@/components/layout/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Modal } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty";
import { Input, Label, Select } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTable, PaginationBar, Toolbar } from "@/components/ui/table";
import { formatINR } from "@/lib/money";
import { ApiError } from "@/api/client";

export function ResidentsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const flats = useQuery({ queryKey: ["flats-all"], queryFn: () => flatsApi.list({ limit: 100 }) });
  const query = useQuery({
    queryKey: ["residents", search, page],
    queryFn: () => residentsApi.list({ search, page, limit: 10, sort: "name", order: "asc" }),
  });
  const create = useMutation({
    mutationFn: (body: Record<string, unknown>) => residentsApi.create(body),
    onSuccess: () => {
      toast.success("Resident added successfully.");
      qc.invalidateQueries({ queryKey: ["residents"] });
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e instanceof ApiError ? e.message : "Failed"),
  });
  const rows = query.data?.items ?? [];

  return (
    <div>
      <PageHeader
        title="Residents"
        subtitle="Directory, occupancy and outstanding dues."
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => downloadExport("residents")}>
              Export CSV
            </Button>
            <Button size="sm" onClick={() => setOpen(true)}>
              Add resident
            </Button>
          </>
        }
      />
      <Toolbar>
        <Input
          className="sm:max-w-sm"
          placeholder="Search name, email or phone"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
      </Toolbar>
      {query.isLoading ? (
        <Skeleton className="h-64" />
      ) : !rows.length ? (
        <EmptyState title="No residents found." action={{ label: "Add resident", onClick: () => setOpen(true) }} />
      ) : (
        <DataTable
          rows={rows}
          rowKey={(row) => String(row.id)}
          columns={[
            { header: "Name", cell: (row) => <span className="font-medium text-slate-900">{String(row.name)}</span> },
            { header: "Flat", cell: (row) => (row.flatId as { flatNumber?: string } | null)?.flatNumber ?? "—" },
            { header: "Phone", cell: (row) => String(row.phone) },
            { header: "Email", cell: (row) => String(row.email) },
            { header: "Status", cell: (row) => <Badge status={String(row.status)} /> },
            { header: "Dues", align: "right", cell: (row) => formatINR(row.outstanding as number) },
          ]}
          mobile={(row) => (
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium text-slate-900">{String(row.name)}</p>
                <p className="mt-1 text-sm text-slate-500">
                  {(row.flatId as { flatNumber?: string } | null)?.flatNumber ?? "Unassigned"} · {String(row.phone)}
                </p>
              </div>
              <div className="text-right">
                <Badge status={String(row.status)} />
                <p className="mt-2 text-sm font-medium tabular-nums">{formatINR(row.outstanding as number)}</p>
              </div>
            </div>
          )}
        />
      )}
      <PaginationBar
        page={page}
        totalPages={query.data?.pagination.totalPages || 1}
        onPrev={() => setPage((p) => p - 1)}
        onNext={() => setPage((p) => p + 1)}
      />
      <Modal title="Add resident" open={open} onClose={() => setOpen(false)}>
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            const form = new FormData(e.currentTarget);
            create.mutate({
              name: form.get("name"),
              email: form.get("email"),
              phone: form.get("phone"),
              password: form.get("password") || "password",
              flatId: form.get("flatId") || undefined,
              occupancyRole: form.get("occupancyRole"),
            });
          }}
        >
          <div>
            <Label>Name</Label>
            <Input name="name" required className="mt-1" />
          </div>
          <div>
            <Label>Email</Label>
            <Input name="email" type="email" required className="mt-1" />
          </div>
          <div>
            <Label>Phone</Label>
            <Input name="phone" required className="mt-1" />
          </div>
          <div>
            <Label>Temporary password</Label>
            <Input name="password" className="mt-1" placeholder="password" />
          </div>
          <div>
            <Label>Flat</Label>
            <Select name="flatId" className="mt-1">
              <option value="">Unassigned</option>
              {flats.data?.items.map((f) => (
                <option key={String(f.id)} value={String(f.id)}>
                  {String(f.flatNumber)}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Occupancy</Label>
            <Select name="occupancyRole" className="mt-1" defaultValue="OWNER">
              <option>OWNER</option>
              <option>TENANT</option>
              <option>FAMILY</option>
            </Select>
          </div>
          <Button className="w-full" disabled={create.isPending}>
            Save resident
          </Button>
        </form>
      </Modal>
    </div>
  );
}

export function BuildingsPage() {
  const qc = useQueryClient();
  const query = useQuery({ queryKey: ["buildings"], queryFn: buildingsApi.list });
  const [open, setOpen] = useState(false);
  const create = useMutation({
    mutationFn: buildingsApi.create,
    onSuccess: () => {
      toast.success("Building created");
      qc.invalidateQueries({ queryKey: ["buildings"] });
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <div>
      <PageHeader
        title="Buildings"
        subtitle="Wings and towers in the society."
        actions={
          <Button size="sm" onClick={() => setOpen(true)}>
            Add building
          </Button>
        }
      />
      {query.isLoading ? (
        <Skeleton className="h-40" />
      ) : !(query.data ?? []).length ? (
        <EmptyState title="No buildings yet." action={{ label: "Add building", onClick: () => setOpen(true) }} />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {(query.data ?? []).map((b) => (
            <Card key={String(b.id)}>
              <CardContent>
                <p className="font-semibold text-slate-900">{String(b.name)}</p>
                <p className="mt-1 text-sm text-slate-500">
                  {String(b.numberOfFloors)} floors · {String(b.units)} units
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      <Modal title="Add building" open={open} onClose={() => setOpen(false)}>
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            create.mutate({ name: f.get("name"), numberOfFloors: Number(f.get("numberOfFloors")) });
          }}
        >
          <div>
            <Label>Name</Label>
            <Input name="name" className="mt-1" required placeholder="C Wing" />
          </div>
          <div>
            <Label>Floors</Label>
            <Input name="numberOfFloors" type="number" min={1} className="mt-1" required />
          </div>
          <Button className="w-full">Create</Button>
        </form>
      </Modal>
    </div>
  );
}

export function FlatsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const buildings = useQuery({ queryKey: ["buildings"], queryFn: buildingsApi.list });
  const query = useQuery({ queryKey: ["flats", search], queryFn: () => flatsApi.list({ search, limit: 50 }) });
  const [open, setOpen] = useState(false);
  const create = useMutation({
    mutationFn: flatsApi.create,
    onSuccess: () => {
      toast.success("Flat created");
      qc.invalidateQueries({ queryKey: ["flats"] });
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const rows = query.data?.items ?? [];
  return (
    <div>
      <PageHeader
        title="Flats"
        subtitle="Units, occupancy and ownership."
        actions={
          <Button size="sm" onClick={() => setOpen(true)}>
            Add flat
          </Button>
        }
      />
      <Toolbar>
        <Input className="sm:max-w-sm" placeholder="Search flat number" value={search} onChange={(e) => setSearch(e.target.value)} />
      </Toolbar>
      {query.isLoading ? (
        <Skeleton className="h-64" />
      ) : !rows.length ? (
        <EmptyState title="No flats found." action={{ label: "Add flat", onClick: () => setOpen(true) }} />
      ) : (
        <DataTable
          rows={rows}
          rowKey={(row) => String(row.id)}
          columns={[
            { header: "Flat", cell: (row) => <span className="font-medium text-slate-900">{String(row.flatNumber)}</span> },
            { header: "Wing", cell: (row) => (row.buildingId as { name?: string })?.name },
            { header: "Type", cell: (row) => String(row.type) },
            { header: "Owner", cell: (row) => (row.owner as { name?: string } | null)?.name ?? "—" },
            { header: "Occupancy", cell: (row) => <Badge status={String(row.ownershipStatus)} /> },
          ]}
          mobile={(row) => (
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-medium text-slate-900">{String(row.flatNumber)}</p>
                <p className="mt-1 text-sm text-slate-500">
                  {String(row.type)} · {(row.buildingId as { name?: string })?.name}
                </p>
              </div>
              <Badge status={String(row.ownershipStatus)} />
            </div>
          )}
        />
      )}
      <Modal title="Add flat" open={open} onClose={() => setOpen(false)}>
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            create.mutate({
              buildingId: f.get("buildingId"),
              flatNumber: f.get("flatNumber"),
              floor: Number(f.get("floor")),
              type: f.get("type"),
              area: Number(f.get("area") || 0),
            });
          }}
        >
          <div>
            <Label>Building</Label>
            <Select name="buildingId" className="mt-1" required>
              {(buildings.data ?? []).map((b) => (
                <option key={String(b.id)} value={String(b.id)}>
                  {String(b.name)}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Flat number</Label>
            <Input name="flatNumber" className="mt-1" required />
          </div>
          <div>
            <Label>Floor</Label>
            <Input name="floor" type="number" className="mt-1" required />
          </div>
          <div>
            <Label>Type</Label>
            <Select name="type" className="mt-1">
              <option>1BHK</option>
              <option>2BHK</option>
              <option>3BHK</option>
              <option>4BHK</option>
              <option>COMMERCIAL</option>
            </Select>
          </div>
          <div>
            <Label>Area (sq.ft)</Label>
            <Input name="area" type="number" className="mt-1" />
          </div>
          <Button className="w-full">Create flat</Button>
        </form>
      </Modal>
    </div>
  );
}

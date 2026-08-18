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
import { formatINR } from "@/lib/money";
import { ApiError } from "@/api/client";

export function ResidentsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const flats = useQuery({ queryKey: ["flats-all"], queryFn: () => flatsApi.list({ limit: 100 }) });
  const query = useQuery({ queryKey: ["residents", search, page], queryFn: () => residentsApi.list({ search, page, limit: 10, sort: "name", order: "asc" }) });
  const create = useMutation({
    mutationFn: (body: Record<string, unknown>) => residentsApi.create(body),
    onSuccess: () => {
      toast.success("Resident added successfully.");
      qc.invalidateQueries({ queryKey: ["residents"] });
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e instanceof ApiError ? e.message : "Failed"),
  });

  return (
    <div>
      <PageHeader
        title="Residents"
        subtitle="Directory, occupancy and dues"
        actions={
          <>
            <Button variant="outline" onClick={() => downloadExport("residents")}>Export CSV</Button>
            <Button onClick={() => setOpen(true)}>Add resident</Button>
          </>
        }
      />
      <div className="mb-4 flex gap-2">
        <Input placeholder="Search name, email or phone" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
      </div>
      {query.isLoading ? <Skeleton className="h-64" /> : !query.data?.items.length ? (
        <EmptyState title="No residents found." action={{ label: "Add resident", onClick: () => setOpen(true) }} />
      ) : (
        <Card>
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  {["Name", "Flat", "Phone", "Email", "Status", "Dues"].map((h) => (
                    <th key={h} className="px-4 py-3 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {query.data.items.map((row) => (
                  <tr key={String(row.id)} className="border-t">
                    <td className="px-4 py-3 font-medium">{String(row.name)}</td>
                    <td className="px-4 py-3">{(row.flatId as { flatNumber?: string } | null)?.flatNumber ?? "—"}</td>
                    <td className="px-4 py-3">{String(row.phone)}</td>
                    <td className="px-4 py-3">{String(row.email)}</td>
                    <td className="px-4 py-3"><Badge status={String(row.status)} /></td>
                    <td className="px-4 py-3">{formatINR(row.outstanding as number)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
        <Button variant="outline" size="sm" disabled={page >= (query.data?.pagination.totalPages || 1)} onClick={() => setPage((p) => p + 1)}>Next</Button>
      </div>
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
          <div><Label>Name</Label><Input name="name" required className="mt-1" /></div>
          <div><Label>Email</Label><Input name="email" type="email" required className="mt-1" /></div>
          <div><Label>Phone</Label><Input name="phone" required className="mt-1" /></div>
          <div><Label>Temporary password</Label><Input name="password" className="mt-1" placeholder="password" /></div>
          <div>
            <Label>Flat</Label>
            <Select name="flatId" className="mt-1">
              <option value="">Unassigned</option>
              {flats.data?.items.map((f) => (
                <option key={String(f.id)} value={String(f.id)}>{String(f.flatNumber)}</option>
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
          <Button className="w-full" disabled={create.isPending}>Save resident</Button>
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
    onSuccess: () => { toast.success("Building created"); qc.invalidateQueries({ queryKey: ["buildings"] }); setOpen(false); },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <div>
      <PageHeader title="Buildings / wings" subtitle="A Wing, B Wing and more" actions={<Button onClick={() => setOpen(true)}>Add building</Button>} />
      {query.isLoading ? <Skeleton className="h-40" /> : (
        <div className="grid gap-4 md:grid-cols-2">
          {(query.data ?? []).map((b) => (
            <Card key={String(b.id)}>
              <CardContent className="p-5">
                <p className="text-lg font-semibold">{String(b.name)}</p>
                <p className="text-sm text-slate-500">{String(b.numberOfFloors)} floors · {String(b.units)} units</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      <Modal title="Add building" open={open} onClose={() => setOpen(false)}>
        <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.currentTarget); create.mutate({ name: f.get("name"), numberOfFloors: Number(f.get("numberOfFloors")) }); }}>
          <div><Label>Name</Label><Input name="name" className="mt-1" required placeholder="C Wing" /></div>
          <div><Label>Floors</Label><Input name="numberOfFloors" type="number" min={1} className="mt-1" required /></div>
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
    onSuccess: () => { toast.success("Flat created"); qc.invalidateQueries({ queryKey: ["flats"] }); setOpen(false); },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <div>
      <PageHeader title="Flats / units" subtitle="Assign owners and occupancy" actions={<Button onClick={() => setOpen(true)}>Add flat</Button>} />
      <Input className="mb-4 max-w-sm" placeholder="Search flat number" value={search} onChange={(e) => setSearch(e.target.value)} />
      {query.isLoading ? <Skeleton className="h-64" /> : (
        <div className="grid gap-3 md:hidden">
          {query.data?.items.map((f) => (
            <Card key={String(f.id)}><CardContent className="p-4">
              <p className="font-semibold">{String(f.flatNumber)}</p>
              <p className="text-sm text-slate-500">{String(f.type)} · {(f.buildingId as { name?: string })?.name}</p>
              <Badge status={String(f.ownershipStatus)} />
            </CardContent></Card>
          ))}
        </div>
      )}
      <Card className="hidden md:block">
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500"><tr>{["Flat","Wing","Type","Owner","Occupancy"].map((h)=><th key={h} className="px-4 py-3 text-left font-medium">{h}</th>)}</tr></thead>
            <tbody>
              {query.data?.items.map((f) => (
                <tr key={String(f.id)} className="border-t">
                  <td className="px-4 py-3 font-medium">{String(f.flatNumber)}</td>
                  <td className="px-4 py-3">{(f.buildingId as { name?: string })?.name}</td>
                  <td className="px-4 py-3">{String(f.type)}</td>
                  <td className="px-4 py-3">{(f.owner as { name?: string } | null)?.name ?? "—"}</td>
                  <td className="px-4 py-3"><Badge status={String(f.ownershipStatus)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
      <Modal title="Add flat" open={open} onClose={() => setOpen(false)}>
        <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.currentTarget); create.mutate({ buildingId: f.get("buildingId"), flatNumber: f.get("flatNumber"), floor: Number(f.get("floor")), type: f.get("type"), area: Number(f.get("area") || 0) }); }}>
          <div>
            <Label>Building</Label>
            <Select name="buildingId" className="mt-1" required>
              {(buildings.data ?? []).map((b) => <option key={String(b.id)} value={String(b.id)}>{String(b.name)}</option>)}
            </Select>
          </div>
          <div><Label>Flat number</Label><Input name="flatNumber" className="mt-1" required /></div>
          <div><Label>Floor</Label><Input name="floor" type="number" className="mt-1" required /></div>
          <div>
            <Label>Type</Label>
            <Select name="type" className="mt-1"><option>1BHK</option><option>2BHK</option><option>3BHK</option><option>4BHK</option><option>COMMERCIAL</option></Select>
          </div>
          <div><Label>Area (sq.ft)</Label><Input name="area" type="number" className="mt-1" /></div>
          <Button className="w-full">Create flat</Button>
        </form>
      </Modal>
    </div>
  );
}

import Link from 'next/link';
import { labels } from '@sismovbe/labels';
import { formatUnitDisplay } from '@/lib/movements.formatters';
import { requireAuth } from '@/lib/auth';
import { getResumoStats, getPendingAsiwebTop6, getRecentActivity } from './data';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/data-table';
import { Clock, ClipboardList, FileText, Timer, ChevronRight } from 'lucide-react';

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatRelativeTime(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Agora';
  if (diffMins < 60) return `${diffMins} min atrás`;
  if (diffHours < 24) return `${diffHours}h atrás`;
  if (diffDays < 7) return `${diffDays} dia(s) atrás`;
  return formatDate(dateStr);
}

function formatEventType(type: string, fromStatus: string | null, toStatus: string | null) {
  if (type === 'STATUS_CHANGE' && toStatus) {
    const statusLabel = labels.status[toStatus as keyof typeof labels.status] ?? toStatus;
    return `Status → ${statusLabel}`;
  }
  return type.replace(/_/g, ' ');
}

export default async function ResumoPage() {
  const auth = await requireAuth();
  const role = auth.profile?.role as string | undefined;
  const isUnitUser = role === 'UNIT_USER';
  const isTech = role === 'TECH';

  const [stats, pendingTop6, recentActivity] = await Promise.all([
    getResumoStats(),
    getPendingAsiwebTop6(),
    getRecentActivity(15),
  ]);

  return (
    <main className="flex-1 p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">{labels.nav.resumo}</h1>
        <p className="text-muted-foreground">Visão geral das movimentações e pendências</p>
      </div>

      {/* 4 Cards */}
      <div className="mb-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {!isUnitUser && !isTech && (
          <Link href="/pending-asiweb">
            <Card className="transition-colors hover:bg-muted/50">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {labels.resumo.pendingAsiweb}
                </CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.pendingAsiweb}</div>
              </CardContent>
            </Card>
          </Link>
        )}

        <Link href={isUnitUser ? '/minhas-solicitacoes' : isTech ? '/fila' : '/requests'}>
          <Card className="transition-colors hover:bg-muted/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {labels.resumo.newRequests}
              </CardTitle>
              <ClipboardList className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.newRequests}</div>
            </CardContent>
          </Card>
        </Link>

        {!isUnitUser && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {labels.resumo.movementsToday}
              </CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.movementsToday}</div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {labels.resumo.avgProcessTime}
            </CardTitle>
            <Timer className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.avgProcessHours != null ? (
                <>
                  {stats.avgProcessHours < 1
                    ? `${Math.round(stats.avgProcessHours * 60)} min`
                    : `${stats.avgProcessHours.toFixed(1)} ${labels.resumo.hours}`}
                </>
              ) : (
                labels.resumo.noData
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Grid: Pendências Top 6 + Atividade recente */}
      <div className={`grid gap-6 ${isUnitUser || isTech ? '' : 'lg:grid-cols-2'}`}>
        {!isUnitUser && !isTech && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>{labels.resumo.pendingAsiwebTop6}</CardTitle>
                <CardDescription>
                  Movimentações entregues/recebidas aguardando processamento ASIWEB
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link href="/pending-asiweb">
                  Ver todas
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {pendingTop6.length === 0 ? (
                <p className="py-8 text-center text-muted-foreground">{labels.resumo.noData}</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Origem</TableHead>
                      <TableHead>Destino</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Data</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingTop6.map((m) => (
                      <TableRow key={m.id}>
                        <TableCell>
                          {formatUnitDisplay(
                            (m.origin_unit as { ul_code?: string } | null)?.ul_code ?? null,
                            (m.origin_unit as { name?: string } | null)?.name ?? null
                          )}
                        </TableCell>
                        <TableCell>
                          {formatUnitDisplay(
                            (m.destination_unit as { ul_code?: string } | null)?.ul_code ?? null,
                            (m.destination_unit as { name?: string } | null)?.name ?? null
                          )}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={m.status as 'delivered' | 'received'} />
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {formatDate(m.created_at)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>{labels.resumo.recentActivity}</CardTitle>
            <CardDescription>Últimos eventos de movimentação</CardDescription>
          </CardHeader>
          <CardContent>
            {recentActivity.length === 0 ? (
              <p className="py-8 text-center text-muted-foreground">{labels.resumo.noData}</p>
            ) : (
              <div className="space-y-4">
                {recentActivity.map((event) => (
                  <div
                    key={event.id}
                    className="flex items-start justify-between gap-4 border-b pb-4 last:border-0 last:pb-0"
                  >
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium">
                        {formatEventType(event.event_type, event.from_status, event.to_status)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {event.actor_name} • {formatRelativeTime(event.created_at)}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {formatDate(event.created_at)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

'use client';

import { useState } from 'react';
import { labels } from '@sismovbe/labels';
import { resetUserPassword, toggleUserActive } from './actions';
import { getAllowedRolesForCreate } from '@/lib/user-roles';
import type { UserRole } from '@/lib/auth';
import type { ProfileWithEmail, UnitOption } from './actions';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { CreateUserDialog } from './create-user-dialog';
import { EditUserDialog } from './edit-user-dialog';
import { MoreHorizontal, Key, Edit, UserCheck, UserX } from 'lucide-react';
import { toast } from 'sonner';

function canEditProfile(actorRole: UserRole, targetRole: UserRole): boolean {
  if (targetRole === 'PATRIMONIO_ADMIN') return actorRole === 'PATRIMONIO_ADMIN';
  if (actorRole === 'PATRIMONIO_ADMIN') return true;
  if (actorRole === 'SEAME_ADMIN') {
    return targetRole !== 'SEAME_ADMIN';
  }
  return false;
}

type Props = {
  users: ProfileWithEmail[];
  units: UnitOption[];
  currentUserRole: UserRole; // PATRIMONIO_ADMIN | SEAME_ADMIN (dashboard only, but type allows all for canEditProfile)
};

export function UsersTable({ users, units, currentUserRole }: Props) {
  const [createOpen, setCreateOpen] = useState(false);
  const [editUser, setEditUser] = useState<ProfileWithEmail | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  const createAllowedRoles = getAllowedRolesForCreate(currentUserRole);
  const editAllowedRoles = createAllowedRoles;

  const handleReset = async (email: string) => {
    const result = await resetUserPassword(email);
    if (result.error) toast.error(result.error);
    else toast.success(labels.users.resetSuccess);
  };

  const handleToggle = async (userId: string, targetRole: UserRole) => {
    const result = await toggleUserActive(userId, targetRole);
    if (result.error) toast.error(result.error);
    else
      toast.success(result.active ? labels.users.activateSuccess : labels.users.deactivateSuccess);
  };

  const openEdit = (user: ProfileWithEmail) => {
    setEditUser(user);
    setEditOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">{labels.nav.users}</h2>
        <Button onClick={() => setCreateOpen(true)}>{labels.users.createUser}</Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>E-mail</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Perfil</TableHead>
              <TableHead>Unidade</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[70px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  {labels.users.noUsers}
                </TableCell>
              </TableRow>
            ) : (
              users.map((u) => {
                const canEdit = canEditProfile(currentUserRole, u.role);
                const unitDisplay = u.unit_name
                  ? `${u.unit_ul_code ?? ''} - ${u.unit_name}`
                  : labels.users.noUnit;
                return (
                  <TableRow key={u.user_id}>
                    <TableCell className="font-medium">{u.email ?? '-'}</TableCell>
                    <TableCell>{u.full_name ?? '-'}</TableCell>
                    <TableCell>{labels.roles[u.role] ?? u.role}</TableCell>
                    <TableCell>{unitDisplay}</TableCell>
                    <TableCell>
                      <Badge variant={u.active ? 'default' : 'secondary'}>
                        {u.active ? labels.status.active : labels.status.inactive}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {canEdit && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEdit(u)}>
                              <Edit className="mr-2 h-4 w-4" />
                              {labels.buttons.edit}
                            </DropdownMenuItem>
                            {u.email && (
                              <DropdownMenuItem onClick={() => handleReset(u.email!)}>
                                <Key className="mr-2 h-4 w-4" />
                                {labels.users.resetPassword}
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => handleToggle(u.user_id, u.role)}>
                              {u.active ? (
                                <>
                                  <UserX className="mr-2 h-4 w-4" />
                                  {labels.users.deactivate}
                                </>
                              ) : (
                                <>
                                  <UserCheck className="mr-2 h-4 w-4" />
                                  {labels.users.activate}
                                </>
                              )}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <CreateUserDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        units={units}
        allowedRoles={createAllowedRoles}
      />
      <EditUserDialog
        open={editOpen}
        onOpenChange={(open) => {
          setEditOpen(open);
          if (!open) setEditUser(null);
        }}
        user={editUser}
        units={units}
        allowedRoles={editAllowedRoles}
      />
    </div>
  );
}

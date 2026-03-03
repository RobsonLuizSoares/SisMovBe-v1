'use client';

import { useQueryState } from '@/lib/use-query-state';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface FilterByQueryProps {
  searchKey?: string;
  searchPlaceholder?: string;
  filterKey?: string;
  filterOptions?: { value: string; label: string }[];
  filterPlaceholder?: string;
}

export function FilterByQuery({
  searchKey = 'search',
  searchPlaceholder = 'Buscar...',
  filterKey = 'filter',
  filterOptions = [],
  filterPlaceholder = 'Todos',
}: FilterByQueryProps) {
  const [search, setSearch] = useQueryState(searchKey);
  const [filter, setFilter] = useQueryState(filterKey);

  return (
    <div className="flex flex-wrap items-end gap-4">
      <div className="flex-1 min-w-[200px]">
        <Label htmlFor="search" className="sr-only">
          Buscar
        </Label>
        <Input
          id="search"
          placeholder={searchPlaceholder}
          value={search}
          onChange={(e) => setSearch(e.target.value || null)}
        />
      </div>
      {filterKey && filterOptions.length > 0 && (
        <div className="w-[180px]">
          <Label htmlFor="filter" className="sr-only">
            Filtrar
          </Label>
          <Select value={filter || 'all'} onValueChange={(v) => setFilter(v === 'all' ? null : v)}>
            <SelectTrigger id="filter">
              <SelectValue placeholder={filterPlaceholder} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{filterPlaceholder}</SelectItem>
              {filterOptions
                .filter((opt) => opt.value && String(opt.value).trim() !== '')
                .map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}

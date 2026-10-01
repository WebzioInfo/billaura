import React from 'react';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableLoader, StatusBadge, DateCell, CurrencyCell } from '@/shared/components/ui';
import apiClient from '@/core/api';
import { useQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';

export const FixedAssetsList = () => {
  const { data: assets = [], isLoading } = useQuery({
    queryKey: ['fixed-assets'],
    queryFn: async () => {
      const res = await apiClient.get('/accounting/fixed-assets');
      const items = res.data || [];
      return Array.isArray(items) ? items : [];
    }
  });

  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-6">
      <PageHeader
        title="Fixed Assets"
        description="Track depreciating assets and capital expenditures"
        primaryAction={
          <button className="bg-accent text-white px-4 py-2 rounded-md flex items-center gap-2 text-sm">
            <Plus className="w-4 h-4" /> Add Asset
          </button>
        }
      />
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="pl-6 pr-4">Asset Name</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Purchase Date</TableHead>
            <TableHead align="right">Purchase Price</TableHead>
            <TableHead align="right">Current Value</TableHead>
            <TableHead align="center" className="pr-6 pl-4">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={6} className="p-0">
                <TableLoader rows={4} />
              </TableCell>
            </TableRow>
          ) : assets.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-12 text-sm text-muted-foreground">
                No fixed assets found.
              </TableCell>
            </TableRow>
          ) : (
            assets.map((asset: any) => (
              <TableRow key={asset.id}>
                <TableCell className="pl-6 pr-4 font-semibold text-foreground">{asset.name}</TableCell>
                <TableCell className="text-muted-foreground">{asset.assetType}</TableCell>
                <DateCell date={asset.purchaseDate} />
                <CurrencyCell amount={Number(asset.purchasePrice || 0)} />
                <CurrencyCell amount={Number(asset.currentValue || 0)} className="font-semibold text-foreground" />
                <TableCell align="center" className="pr-6 pl-4">
                  <StatusBadge status={asset.status} />
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
};



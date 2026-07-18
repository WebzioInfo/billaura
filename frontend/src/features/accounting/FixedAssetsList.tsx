import React from 'react';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/components/ui/Table';
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
      <div className="bg-white border rounded-lg shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Asset Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Purchase Date</TableHead>
              <TableHead>Purchase Price</TableHead>
              <TableHead>Current Value</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-4">Loading assets...</TableCell></TableRow>
            ) : assets.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-4 text-gray-500">No fixed assets found.</TableCell></TableRow>
            ) : (
              assets.map((asset: any) => (
                <TableRow key={asset.id}>
                  <TableCell className="font-medium">{asset.name}</TableCell>
                  <TableCell>{asset.assetType}</TableCell>
                  <TableCell>{new Date(asset.purchaseDate).toLocaleDateString()}</TableCell>
                  <TableCell>${Number(asset.purchasePrice).toFixed(2)}</TableCell>
                  <TableCell className="font-semibold">${Number(asset.currentValue).toFixed(2)}</TableCell>
                  <TableCell>
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">{asset.status}</span>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

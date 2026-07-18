import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit, Trash2, Search, FileImage } from 'lucide-react';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { PageContainer, EmptyState } from '@/shared/components/ui/LayoutComponents';
import { Card, CardHeader, CardTitle, CardContent } from '@/shared/components/ui/Card';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';
import { Badge } from '@/shared/components/ui/Badge';
import { ConfirmDialog } from '@/shared/components/ui/action-system/ConfirmDialog';
import { useDebounce } from '@/shared/hooks/useDebounce';
import apiClient from '@/core/api';
import notification from '@/core/services/NotificationService';
import { useNavigate } from 'react-router-dom';

export const TemplatesList = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 500);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<any>(null);

  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['document-templates'],
    queryFn: async () => {
      const res = await apiClient.get('/settings/document-templates');
      return res.data;
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => apiClient.delete(`/settings/document-templates/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document-templates'] });
      notification.success('Template deleted successfully');
      setIsDeleteDialogOpen(false);
    },
    onError: (err: any) => {
      notification.error(err.response?.data?.message || 'Failed to delete template');
      setIsDeleteDialogOpen(false);
    }
  });

  const filteredTemplates = Array.isArray(templates) ? templates.filter((t: any) => 
    t.name.toLowerCase().includes(debouncedSearch.toLowerCase())
  ) : [];

  const handleDeleteRequest = (template: any) => {
    setTemplateToDelete(template);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (templateToDelete) {
      deleteMutation.mutate(templateToDelete.id);
    }
  };

  return (
    <PageContainer maxWidth="7xl">
      <PageHeader 
        title="Document Templates" 
        description="Design and manage custom PDF templates for invoices, quotations, and more."
        primaryAction={
          <Button variant="primary" className="flex items-center gap-2" onClick={() => navigate('/settings/templates/new')}>
            <Plus className="w-4 h-4" /> Design New Template
          </Button>
        }
      />

      <div className="mt-8 flex items-center bg-surface p-4 rounded-xl border border-border shadow-sm">
        <div className="relative w-full max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input 
            placeholder="Search templates..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 bg-background"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <Card key={i} className="animate-pulse bg-muted/20 border-border h-64" />
          ))}
        </div>
      ) : filteredTemplates.length === 0 ? (
        <div className="mt-6 bg-surface rounded-xl border border-border shadow-sm overflow-hidden">
          <EmptyState
            title="No Templates Found"
            description={debouncedSearch ? "No templates match your search." : "Create beautiful templates for your business documents."}
            actionLabel={debouncedSearch ? "Clear Search" : "Create First Template"}
            onActionClick={() => debouncedSearch ? setSearchTerm('') : navigate('/settings/templates/new')}
          />
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          {filteredTemplates.map((template: any) => (
            <Card key={template.id} className="group hover:shadow-md transition-all border-border overflow-hidden flex flex-col">
              <div className="h-40 bg-muted/30 border-b border-border flex items-center justify-center relative overflow-hidden">
                <FileImage className="w-16 h-16 text-muted-foreground/30" />
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity gap-4">
                  <Button variant="primary" size="sm" onClick={() => navigate(`/settings/templates/${template.id}/edit`)}>
                    <Edit className="w-4 h-4 mr-2" /> Edit Design
                  </Button>
                </div>
              </div>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg">{template.name}</CardTitle>
                  {template.isDefault && (
                    <Badge variant="info" className="text-xs">Default</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="mt-auto">
                <p className="text-sm text-muted-foreground mb-4">
                  Type: <span className="font-medium text-foreground">{template.type}</span>
                </p>
                <div className="flex justify-between items-center pt-4 border-t border-border">
                  <span className="text-xs text-muted-foreground">Updated {new Date(template.updatedAt).toLocaleDateString()}</span>
                  <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10 h-8 px-2" onClick={() => handleDeleteRequest(template)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={confirmDelete}
        title="Delete Template"
        message={`Are you sure you want to delete the template "${templateToDelete?.name}"?`}
        confirmText="Delete"
        variant="danger"
        
      />
    </PageContainer>
  );
};

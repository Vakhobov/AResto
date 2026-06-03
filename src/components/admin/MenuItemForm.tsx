import { useState } from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { MenuItem, Category } from '@/types/kiosk';
import { categories } from '@/data/menuData';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/lib/supabase';

interface MenuItemFormProps {
  item: MenuItem | null;
  categories?: ReadonlyArray<{ id: string; name: string; icon: string }>;
  onSubmit: (item: Omit<MenuItem, 'id'>) => void;
  onClose: () => void;
}

export const MenuItemForm = ({ item, categories: formCategories = categories, onSubmit, onClose }: MenuItemFormProps) => {
  const [formData, setFormData] = useState<{
    name: string;
    description: string;
    price: string;
    image: string;
    category: Category;
    available: boolean;
    has3d: boolean;
    modelFile?: File | null;
    modelUrl?: string | null;
  }>({
    name: item?.name || '',
    description: item?.description || '',
    price: item?.price?.toString() || '',
    image: item?.image || '',
    category: item?.category || 'tacos',
    available: item?.available ?? true,
    has3d: Boolean(item?.hasAR || item?.modelUrl),
    modelFile: null,
    modelUrl: item?.modelUrl ?? null,
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);

    try {
      if (formData.has3d && !formData.modelFile && !formData.modelUrl) {
        throw new Error('Please upload a .glb file or keep an existing 3D model URL.');
      }

      let uploadedModelUrl = formData.modelUrl ?? null;

      // If a model file was selected, upload to Supabase Storage (bucket: models)
      if (formData.modelFile) {
        const file = formData.modelFile;
        const filePath = `models/${Date.now()}_${file.name}`;
        const { error: uploadErr } = await supabase.storage.from('models').upload(filePath, file, {
          contentType: 'model/gltf-binary',
          upsert: true,
        });
        if (uploadErr) {
          console.error('Model upload failed', uploadErr);
          throw uploadErr;
        }

        const { data: pub } = supabase.storage.from('models').getPublicUrl(filePath);
        uploadedModelUrl = pub.publicUrl ?? null;
      }

      await onSubmit({
        name: formData.name,
        description: formData.description,
        price: parseFloat(formData.price) || 0,
        image: formData.image,
        category: formData.category as Category,
        available: formData.available,
        hasAR: formData.has3d,
        modelUrl: uploadedModelUrl ?? undefined,
      });
    } catch (err: any) {
      const message = err?.message ?? 'Unknown error while saving';
      console.error('Menu item save error:', err);
      setError(message);
      return;
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-card border border-border rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-xl font-bold text-foreground">
            {item ? 'Edit Item' : 'Add New Item'}
          </h2>
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-xl">
            <X className="w-5 h-5" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Item name"
              required
              className="rounded-xl"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Brief description"
              className="rounded-xl resize-none"
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="price">Price ($)</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                min="0"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                placeholder="0.00"
                required
                className="rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select
                value={formData.category}
                onValueChange={(value: Category) => setFormData({ ...formData, category: value })}
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {formCategories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.icon} {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="image">Image URL</Label>
            <Input
              id="image"
              type="url"
              value={formData.image}
              onChange={(e) => setFormData({ ...formData, image: e.target.value })}
              placeholder="https://..."
              className="rounded-xl"
            />
            {formData.image && (
              <img
                src={formData.image}
                alt="Preview"
                className="w-full h-32 object-cover rounded-xl mt-2"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            )}
          </div>

          <div className="flex items-center justify-between py-2">
            <Label htmlFor="has3d">Has 3D model (.glb)</Label>
            <Switch
              id="has3d"
              checked={formData.has3d}
              onCheckedChange={(checked) => setFormData({ ...formData, has3d: Boolean(checked) })}
            />
          </div>

          {formData.has3d && (
            <div className="space-y-2">
              <Label htmlFor="model-file">Upload .glb model</Label>
              <input
                id="model-file"
                type="file"
                accept=".glb"
                title="Upload .glb 3D model"
                aria-label="Upload .glb 3D model"
                onChange={(e) => {
                  const f = e.target.files?.[0] ?? null;
                  setFormData({ ...formData, modelFile: f });
                }}
                className="rounded-xl"
              />
              {formData.modelUrl && (
                <div className="text-sm text-muted-foreground">Existing model: <a href={formData.modelUrl} target="_blank" rel="noreferrer" className="text-primary underline">Open</a></div>
              )}
              {formData.modelFile && (
                <div className="text-sm">Selected: {formData.modelFile.name}</div>
              )}
            </div>
          )}

          <div className="flex items-center justify-between py-2">
            <Label htmlFor="available">Available</Label>
            <Switch
              id="available"
              checked={formData.available}
              onCheckedChange={(checked) => setFormData({ ...formData, available: checked })}
            />
          </div>

          {error && (
            <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1 rounded-xl"
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 rounded-xl bg-primary hover:bg-primary/90"
              disabled={saving}
            >
              {saving ? 'Saving...' : item ? 'Save Changes' : 'Add Item'}
            </Button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};

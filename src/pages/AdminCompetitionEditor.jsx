import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Modal } from '@/components/ui/Modal'
import { toast, Toaster } from 'sonner'
import { ArrowLeft, Plus, Trash2, GripVertical, Edit, Save, X, ArrowUp, ArrowDown } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function AdminCompetitionEditor() {
  const [categories, setCategories] = useState([])
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState(null)
  const [loading, setLoading] = useState(false)
  
  // Form state for category
  const [categoryForm, setCategoryForm] = useState({
    name: '',
    description: '',
    percentage: '',
    criteria: []
  })
  
  // Temporary criteria being added
  const [newCriterion, setNewCriterion] = useState({ name: '', max_points: '' })

  useEffect(() => {
    fetchCategories()
  }, [])

  const fetchCategories = async () => {
    const { data } = await supabase
      .from('categories')
      .select('*, criteria(*)')
      .order('order_index')

    setCategories(data || [])
  }

  const handleOpenModal = (category = null) => {
    if (category) {
      setEditingCategory(category)
      setCategoryForm({
        name: category.name,
        description: category.description || '',
        percentage: category.percentage || '',
        criteria: category.criteria || []
      })
    } else {
      setEditingCategory(null)
      setCategoryForm({
        name: '',
        description: '',
        percentage: '',
        criteria: []
      })
    }
    setIsAddModalOpen(true)
  }

  const handleAddCriterion = () => {
    if (!newCriterion.name.trim() || !newCriterion.max_points) {
      toast.error('Please fill in criterion name and max points')
      return
    }

    setCategoryForm({
      ...categoryForm,
      criteria: [...categoryForm.criteria, { ...newCriterion }]
    })
    setNewCriterion({ name: '', max_points: '' })
  }

  const handleRemoveCriterion = (index) => {
    setCategoryForm({
      ...categoryForm,
      criteria: categoryForm.criteria.filter((_, i) => i !== index)
    })
  }

  const getTotalPoints = () => {
    return categoryForm.criteria.reduce((sum, c) => sum + (parseFloat(c.max_points) || 0), 0)
  }

  const getTotalPercentage = () => {
    return categories.reduce((sum, c) => {
      if (editingCategory && c.id === editingCategory.id) return sum
      return sum + (parseFloat(c.percentage) || 0)
    }, parseFloat(categoryForm.percentage) || 0)
  }

  const handleSaveCategory = async () => {
    if (!categoryForm.name.trim()) {
      toast.error('Please enter category name')
      return
    }

    if (!categoryForm.percentage || categoryForm.percentage <= 0) {
      toast.error('Please enter a valid percentage')
      return
    }

    const totalPercentage = getTotalPercentage()
    if (totalPercentage > 100) {
      toast.error(`Total percentage cannot exceed 100%. Current total: ${totalPercentage}%`)
      return
    }

    if (categoryForm.criteria.length === 0) {
      toast.error('Please add at least one criterion')
      return
    }

    setLoading(true)

    try {
      let categoryId

      if (editingCategory) {
        // Update existing category
        const { error: categoryError } = await supabase
          .from('categories')
          .update({
            name: categoryForm.name,
            description: categoryForm.description,
            percentage: parseFloat(categoryForm.percentage)
          })
          .eq('id', editingCategory.id)

        if (categoryError) throw categoryError
        categoryId = editingCategory.id

        // Delete old criteria
        await supabase
          .from('criteria')
          .delete()
          .eq('category_id', categoryId)
      } else {
        // Create new category
        const { data: newCategory, error: categoryError } = await supabase
          .from('categories')
          .insert({
            name: categoryForm.name,
            description: categoryForm.description,
            percentage: parseFloat(categoryForm.percentage),
            order_index: categories.length
          })
          .select()
          .single()

        if (categoryError) throw categoryError
        categoryId = newCategory.id
      }

      // Insert criteria
      const criteriaToInsert = categoryForm.criteria.map((criterion, index) => ({
        category_id: categoryId,
        name: criterion.name,
        max_points: parseFloat(criterion.max_points),
        order_index: index
      }))

      const { error: criteriaError } = await supabase
        .from('criteria')
        .insert(criteriaToInsert)

      if (criteriaError) throw criteriaError

      toast.success(`Category ${editingCategory ? 'updated' : 'created'} successfully!`)
      setIsAddModalOpen(false)
      setCategoryForm({ name: '', description: '', percentage: '', criteria: [] })
      fetchCategories()
    } catch (error) {
      console.error(error)
      toast.error('Failed to save category')
    }

    setLoading(false)
  }

  const handleDeleteCategory = async (category) => {
    if (!confirm(`Are you sure you want to delete "${category.name}"? This will also delete all criteria and scores for this category.`)) {
      return
    }

    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', category.id)

    if (error) {
      toast.error('Failed to delete category')
      return
    }

    toast.success('Category deleted successfully')
    fetchCategories()
  }

  const handleToggleOpen = async (category) => {
    const { error } = await supabase
      .from('categories')
      .update({ is_open: !category.is_open })
      .eq('id', category.id)

    if (error) {
      toast.error('Failed to update category')
      return
    }

    fetchCategories()
  }

  const handleToggleConvention = async (category) => {
    const { error } = await supabase
      .from('categories')
      .update({ is_convention: !category.is_convention })
      .eq('id', category.id)

    if (error) {
      toast.error('Failed to update category')
      return
    }

    fetchCategories()
  }

  const handleMoveCategory = async (categoryId, direction) => {
    const currentIndex = categories.findIndex(c => c.id === categoryId)
    if (currentIndex === -1) return
    
    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
    if (newIndex < 0 || newIndex >= categories.length) return

    // Swap order_index values
    const category1 = categories[currentIndex]
    const category2 = categories[newIndex]

    await Promise.all([
      supabase.from('categories').update({ order_index: category2.order_index }).eq('id', category1.id),
      supabase.from('categories').update({ order_index: category1.order_index }).eq('id', category2.id)
    ])

    fetchCategories()
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <Toaster position="top-center" richColors />
      
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Link to="/admin">
              <Button variant="outline" size="icon">
                <ArrowLeft size={20} />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Competition Editor</h1>
              <p className="text-muted-foreground">Customize categories and scoring criteria</p>
            </div>
          </div>
          <Button onClick={() => handleOpenModal()} size="lg">
            <Plus className="mr-2" size={20} />
            Add Category
          </Button>
        </div>

        {/* Total Percentage Display */}
        <Card className="bg-card border-border mb-6">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Competition Weight</p>
                <p className={`text-3xl font-bold ${getTotalPercentage() === 100 ? 'text-green-500' : getTotalPercentage() > 100 ? 'text-red-500' : 'text-primary'}`}>
                  {getTotalPercentage()}%
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Categories</p>
                <p className="text-3xl font-bold text-foreground">{categories.length}</p>
              </div>
              {getTotalPercentage() !== 100 && (
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Remaining</p>
                  <p className="text-2xl font-bold text-primary">{100 - getTotalPercentage()}%</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Categories List */}
        <div className="space-y-4">
          {categories.length === 0 ? (
            <Card className="bg-card border-border">
              <CardContent className="py-12 text-center">
                <Plus size={48} className="mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No categories yet. Add your first category to get started.</p>
              </CardContent>
            </Card>
          ) : (
            categories.map((category, index) => (
              <Card key={category.id} className="bg-card border-border">
                <CardContent className="py-4">
                  <div className="space-y-4">
                    {/* Category Header */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-2 flex-1">
                        {/* Reorder Buttons */}
                        <div className="flex flex-col gap-1">
                          <button
                            onClick={() => handleMoveCategory(category.id, 'up')}
                            disabled={index === 0}
                            className="p-1 hover:bg-secondary rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            title="Move up"
                          >
                            <ArrowUp size={16} className="text-muted-foreground" />
                          </button>
                          <button
                            onClick={() => handleMoveCategory(category.id, 'down')}
                            disabled={index === categories.length - 1}
                            className="p-1 hover:bg-secondary rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            title="Move down"
                          >
                            <ArrowDown size={16} className="text-muted-foreground" />
                          </button>
                        </div>
                        <GripVertical size={24} className="text-muted-foreground mt-1" />
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-xl font-bold text-foreground">{category.name}</h3>
                            <span className="text-lg font-bold text-primary">{category.percentage}%</span>
                          </div>
                          {category.description && (
                            <p className="text-sm text-muted-foreground mb-3">{category.description}</p>
                          )}
                          
                          {/* Criteria List */}
                          <div className="space-y-2">
                            <p className="text-xs font-bold text-muted-foreground uppercase">Criteria for Judging</p>
                            {category.criteria && category.criteria.length > 0 ? (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                {category.criteria.map((criterion) => (
                                  <div key={criterion.id} className="flex items-center justify-between bg-secondary/50 px-3 py-2 rounded">
                                    <span className="text-sm text-foreground">{criterion.name}</span>
                                    <span className="text-sm font-bold text-primary">{criterion.max_points} pts</span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-sm text-muted-foreground italic">No criteria defined</p>
                            )}
                            <div className="flex items-center gap-4 mt-2">
                              <p className="text-xs text-muted-foreground">
                                Total: <span className="font-bold text-foreground">
                                  {category.criteria?.reduce((sum, c) => sum + (c.max_points || 0), 0) || 0}/100 pts
                                </span>
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenModal(category)}
                        >
                          <Edit size={16} className="mr-2" />
                          Edit
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteCategory(category)}
                        >
                          <Trash2 size={16} />
                        </Button>
                      </div>
                    </div>

                    {/* Category Settings */}
                    <div className="flex items-center gap-6 pt-2 border-t border-border">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={category.is_open || false}
                          onChange={() => handleToggleOpen(category)}
                          className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                        />
                        <span className="text-sm text-muted-foreground">Open Category</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={category.is_convention || false}
                          onChange={() => handleToggleConvention(category)}
                          className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                        />
                        <span className="text-sm text-muted-foreground">Convention Category</span>
                      </label>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Add/Edit Category Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title={editingCategory ? 'Edit Category' : 'New Category'}
        size="lg"
      >
        <div className="space-y-6">
          {/* Category Basic Info */}
          <div className="space-y-4">
            <div>
              <Label>Category Name</Label>
              <Input
                placeholder="e.g., Opening Statement, Swimwear, Q&A"
                value={categoryForm.name}
                onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
              />
            </div>

            <div>
              <Label>Category Description (Optional)</Label>
              <textarea
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                rows={3}
                placeholder="Brief description of this category..."
                value={categoryForm.description}
                onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
              />
            </div>

            <div>
              <Label>Category Percentage</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  placeholder="e.g., 25"
                  value={categoryForm.percentage}
                  onChange={(e) => setCategoryForm({ ...categoryForm, percentage: e.target.value })}
                />
                <span className="text-lg font-bold text-primary">%</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Total percentage: {getTotalPercentage()}% / 100%
              </p>
            </div>
          </div>

          {/* Criteria Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Criteria for Judging</Label>
              <p className="text-sm text-muted-foreground">
                Total: <span className={`font-bold ${getTotalPoints() === 100 ? 'text-green-500' : 'text-primary'}`}>
                  {getTotalPoints()}/100 pts
                </span>
              </p>
            </div>

            {/* Criteria List */}
            {categoryForm.criteria.length > 0 && (
              <div className="space-y-2">
                {categoryForm.criteria.map((criterion, index) => (
                  <div key={index} className="flex items-center gap-2 bg-secondary/50 p-3 rounded">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">{criterion.name}</p>
                    </div>
                    <div className="text-sm font-bold text-primary">{criterion.max_points} pts</div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRemoveCriterion(index)}
                    >
                      <X size={16} />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {/* Add New Criterion */}
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <Label className="text-xs">Criteria Name</Label>
                <Input
                  placeholder="e.g., Stage Presence"
                  value={newCriterion.name}
                  onChange={(e) => setNewCriterion({ ...newCriterion, name: e.target.value })}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddCriterion()}
                />
              </div>
              <div className="w-32">
                <Label className="text-xs">Max Points</Label>
                <div className="flex items-center gap-1">
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    placeholder="50"
                    value={newCriterion.max_points}
                    onChange={(e) => setNewCriterion({ ...newCriterion, max_points: e.target.value })}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddCriterion()}
                  />
                  <span className="text-xs text-muted-foreground">pts</span>
                </div>
              </div>
              <Button onClick={handleAddCriterion} variant="outline">
                <Plus size={16} className="mr-2" />
                Add
              </Button>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex gap-2">
            <Button onClick={handleSaveCategory} className="flex-1" disabled={loading}>
              <Save size={16} className="mr-2" />
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
            <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

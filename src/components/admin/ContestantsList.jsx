import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import Modal from '@/components/ui/Modal'
import { toast } from 'sonner'
import { UserPlus, Edit, Trash2, Upload, Search } from 'lucide-react'

function ContestantModal({ isOpen, onClose, contestant, onSuccess }) {
  const [formData, setFormData] = useState({
    name: '',
    college: '',
    number: '',
    sex: '',
    age: '',
    photo_url: ''
  })
  const [loading, setLoading] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)

  useEffect(() => {
    if (contestant) {
      setFormData({
        name: contestant.name || '',
        college: contestant.college || '',
        number: contestant.number || '',
        sex: contestant.sex || '',
        age: contestant.age || '',
        photo_url: contestant.photo_url || ''
      })
    } else {
      setFormData({ name: '', college: '', number: '', sex: '', age: '', photo_url: '' })
    }
  }, [contestant, isOpen])

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file')
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size should be less than 5MB')
      return
    }

    setUploadingPhoto(true)

    try {
      // Create a unique filename
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
      const filePath = `contestants/${fileName}`

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('photos')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (error) {
        // If bucket doesn't exist, provide helpful error
        if (error.message.includes('Bucket not found')) {
          toast.error('Storage bucket not configured! See STORAGE_SETUP_INSTRUCTIONS.md', {
            duration: 8000,
            action: {
              label: 'View Guide',
              onClick: () => {
                window.open('https://app.supabase.com', '_blank')
              }
            }
          })
          console.error('Storage Setup Required:', '\n' +
            '1. Go to Supabase Dashboard → Storage\n' +
            '2. Create bucket named "photos" (must be PUBLIC)\n' +
            '3. Add storage policies (see STORAGE_SETUP_INSTRUCTIONS.md)\n' +
            '4. Refresh and try again')
        } else if (error.message.includes('permission') || error.message.includes('policy')) {
          toast.error('Storage permission denied. Please check bucket policies.', {
            duration: 6000
          })
          console.error('Storage policies missing. Run supabase-storage-setup.sql')
        } else {
          throw error
        }
        setUploadingPhoto(false)
        return
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('photos')
        .getPublicUrl(filePath)

      setFormData({ ...formData, photo_url: publicUrl })
      toast.success('Photo uploaded successfully!')
    } catch (error) {
      console.error('Upload error:', error)
      toast.error('Failed to upload photo')
    }

    setUploadingPhoto(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!formData.name.trim() || !formData.number || !formData.college.trim() || !formData.sex || !formData.age) {
      toast.error('Please fill in all required fields')
      return
    }

    if (!formData.photo_url) {
      toast.error('Please upload a photo')
      return
    }

    setLoading(true)

    // Check if contestant with same number and sex already exists (only for new contestants)
    if (!contestant) {
      const { data: existingContestants, error: checkError } = await supabase
        .from('contestants')
        .select('id')
        .eq('number', parseInt(formData.number))
        .eq('sex', formData.sex)

      if (!checkError && existingContestants && existingContestants.length > 0) {
        setLoading(false)
        toast.error(`${formData.sex} candidate #${formData.number} already exists`)
        return
      }
    }

    let result
    if (contestant) {
      result = await supabase
        .from('contestants')
        .update({
          name: formData.name.trim(),
          college: formData.college.trim(),
          number: parseInt(formData.number),
          sex: formData.sex,
          age: parseInt(formData.age),
          photo_url: formData.photo_url.trim()
        })
        .eq('id', contestant.id)
    } else {
      result = await supabase
        .from('contestants')
        .insert({
          name: formData.name.trim(),
          college: formData.college.trim(),
          number: parseInt(formData.number),
          sex: formData.sex,
          age: parseInt(formData.age),
          photo_url: formData.photo_url.trim()
        })
    }

    setLoading(false)

    if (result.error) {
      console.error('Save contestant error:', result.error)
      toast.error(`Failed to save contestant: ${result.error.message || 'Unknown error'}`)
      return
    }

    toast.success(`Contestant ${contestant ? 'updated' : 'added'} successfully!`)
    onSuccess()
    onClose()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={contestant ? 'Edit Contestant' : 'Add New Contestant'}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="name">
            Name <span className="text-red-500">*</span>
          </Label>
          <Input
            id="name"
            placeholder="Enter full name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
        </div>

        <div>
          <Label htmlFor="college">
            College <span className="text-red-500">*</span>
          </Label>
          <Input
            id="college"
            placeholder="Enter college/school name"
            value={formData.college}
            onChange={(e) => setFormData({ ...formData, college: e.target.value })}
            required
          />
        </div>

        <div>
          <Label htmlFor="sex">
            Sex <span className="text-red-500">*</span>
          </Label>
          <select
            id="sex"
            value={formData.sex}
            onChange={(e) => setFormData({ ...formData, sex: e.target.value })}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Select sex</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
          </select>
          <p className="text-xs text-gray-500 mt-1">
            Male and Female contestants can have the same candidate number
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="number">
              Candidate No. <span className="text-red-500">*</span>
            </Label>
            <Input
              id="number"
              type="number"
              placeholder="Enter number"
              value={formData.number}
              onChange={(e) => setFormData({ ...formData, number: e.target.value })}
              required
              min="1"
            />
            <p className="text-xs text-gray-500 mt-1">
              {formData.sex ? `${formData.sex} #${formData.number || '?'}` : 'Select sex first'}
            </p>
          </div>

          <div>
            <Label htmlFor="age">
              Age <span className="text-red-500">*</span>
            </Label>
            <Input
              id="age"
              type="number"
              placeholder="Enter age"
              value={formData.age}
              onChange={(e) => setFormData({ ...formData, age: e.target.value })}
              required
              min="1"
              max="120"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="photo">
            Photo <span className="text-red-500">*</span>
          </Label>
          <div className="mt-2">
            <input
              id="photo"
              type="file"
              accept="image/*"
              onChange={handlePhotoUpload}
              disabled={uploadingPhoto}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50"
            />
            <p className="text-xs text-gray-500 mt-1">
              Upload a photo (Max 5MB, JPG/PNG)
            </p>
          </div>
          {uploadingPhoto && (
            <div className="mt-2 flex items-center gap-2 text-sm text-blue-600">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              Uploading...
            </div>
          )}
        </div>

        {formData.photo_url && (
          <div>
            <Label>Photo Preview</Label>
            <div className="mt-2 relative w-full h-64 bg-gray-100 rounded-lg overflow-hidden">
              <img
                src={formData.photo_url}
                alt="Preview"
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.target.style.display = 'none'
                  toast.error('Invalid image URL')
                }}
              />
            </div>
          </div>
        )}

        <div className="flex gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button type="submit" disabled={loading || uploadingPhoto} className="flex-1">
            {loading ? 'Saving...' : contestant ? 'Update' : 'Add Contestant'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

export default function ContestantsList() {
  const [contestants, setContestants] = useState([])
  const [filteredContestants, setFilteredContestants] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [genderFilter, setGenderFilter] = useState('All') // All, Male, Female
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingContestant, setEditingContestant] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchContestants()
    
    // Subscribe to realtime updates
    const subscription = supabase
      .channel('contestants-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'contestants' }, () => {
        fetchContestants()
      })
      .subscribe()

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    // Filter contestants based on search query and gender
    let filtered = contestants

    // Apply gender filter
    if (genderFilter !== 'All') {
      filtered = filtered.filter(c => c.sex === genderFilter)
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(c => 
        c.name.toLowerCase().includes(query) || 
        c.number.toString().includes(query) ||
        (c.college && c.college.toLowerCase().includes(query))
      )
    }

    setFilteredContestants(filtered)
  }, [searchQuery, contestants, genderFilter])

  const fetchContestants = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('contestants')
      .select('*')
      .order('number')

    setContestants(data || [])
    setLoading(false)
  }

  const handleEdit = (contestant) => {
    setEditingContestant(contestant)
    setIsModalOpen(true)
  }

  const handleAdd = () => {
    setEditingContestant(null)
    setIsModalOpen(true)
  }

  const handleDelete = async (contestant) => {
    if (!confirm(`Delete ${contestant.name}? This will also delete all their scores.`)) {
      return
    }

    const { error } = await supabase
      .from('contestants')
      .delete()
      .eq('id', contestant.id)

    if (error) {
      toast.error('Failed to delete contestant')
      return
    }

    toast.success('Contestant deleted successfully')
  }

  const handleModalClose = () => {
    setIsModalOpen(false)
    setEditingContestant(null)
  }

  const maleCount = contestants.filter(c => c.sex === 'Male').length
  const femaleCount = contestants.filter(c => c.sex === 'Female').length

  return (
    <div className="space-y-4">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <Input
            placeholder="Search by name or number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button onClick={handleAdd} size="lg">
          <UserPlus className="mr-2" size={20} />
          Add Contestant
        </Button>
      </div>

      {/* Gender Filter Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        <button
          onClick={() => setGenderFilter('All')}
          className={`px-6 py-3 font-semibold transition-colors border-b-2 ${
            genderFilter === 'All'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          All ({contestants.length})
        </button>
        <button
          onClick={() => setGenderFilter('Male')}
          className={`px-6 py-3 font-semibold transition-colors border-b-2 ${
            genderFilter === 'Male'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Male ({maleCount})
        </button>
        <button
          onClick={() => setGenderFilter('Female')}
          className={`px-6 py-3 font-semibold transition-colors border-b-2 ${
            genderFilter === 'Female'
              ? 'border-pink-600 text-pink-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Female ({femaleCount})
        </button>
      </div>

      {/* Contestants Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-12 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-500">Loading contestants...</p>
            </div>
          ) : filteredContestants.length === 0 ? (
            <div className="py-12 text-center">
              <UserPlus size={48} className="mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500">
                {searchQuery ? 'No contestants found' : 'No contestants yet'}
              </p>
              {!searchQuery && (
                <Button onClick={handleAdd} variant="outline" className="mt-4">
                  Add your first contestant
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      No.
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Photo
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      College
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Sex
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Age
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredContestants.map((contestant) => (
                    <tr key={contestant.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${
                            contestant.sex === 'Male' 
                              ? 'bg-gradient-to-br from-blue-500 to-blue-600' 
                              : 'bg-gradient-to-br from-pink-500 to-pink-600'
                          }`}>
                            {contestant.number}
                          </div>
                          <span className={`text-xs font-semibold px-2 py-1 rounded ${
                            contestant.sex === 'Male'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-pink-100 text-pink-800'
                          }`}>
                            {contestant.sex?.charAt(0)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {contestant.photo_url ? (
                          <img
                            src={contestant.photo_url}
                            alt={contestant.name}
                            className="w-16 h-16 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="w-16 h-16 rounded-lg bg-gray-100 flex items-center justify-center">
                            <Upload size={24} className="text-gray-400" />
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">
                          {contestant.name}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-600">
                          {contestant.college || '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-600">
                          {contestant.sex || '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-600">
                          {contestant.age || '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(contestant)}
                          >
                            <Edit size={16} className="mr-1" />
                            Edit
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDelete(contestant)}
                          >
                            <Trash2 size={16} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Contestant Modal */}
      <ContestantModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        contestant={editingContestant}
        onSuccess={fetchContestants}
      />
    </div>
  )
}

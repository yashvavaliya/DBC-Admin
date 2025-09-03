import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CreditCard,
  Plus,
  Eye,
  Settings,
  LogOut,
  Save,
  Trash2,
  Copy,
  ExternalLink,
  Palette,
  Layout,
  User,
  Building,
  Mail,
  Phone,
  Globe,
  MessageSquare,
  MapPin,
  Share2,
  Download,
  QrCode,
  Loader2,
  AlertCircle,
  CheckCircle,
  Users,
  BarChart3,
  Zap,
  Link as LinkIcon,
  Star,
  Video
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { CardPreview } from './CardPreview';
import { ImageUpload } from './ImageUpload';
import { MediaUpload } from './MediaUpload';
import { ReviewsManager } from './ReviewsManager';
import { generateSocialLink, SOCIAL_PLATFORMS, generateAutoSyncedLinks } from '../utils/socialUtils';
import type { Database } from '../lib/supabase';

type SocialLink = Database['public']['Tables']['social_links']['Row'];
type BusinessCard = Database['public']['Tables']['business_cards']['Row'];

interface MediaItem {
  id: string;
  type: 'video';
  url: string;
  title: string;
  description?: string;
}

interface ReviewLink {
  id: string;
  title: string;
  review_url: string;
  created_at: string;
}

interface FormData {
  // Basic Information
  title: string;
  username: string;
  globalUsername: string;
  company: string;
  tagline: string;
  profession: string;
  avatar_url: string;

  // Contact Information
  phone: string;
  whatsapp: string;
  email: string;
  website: string;
  address: string;
  map_link: string;

  // Theme and Layout
  theme: {
    primary: string;
    secondary: string;
    background: string;
    text: string;
    name: string;
  };
  shape: string;
  layout: {
    style: string;
    alignment: string;
    font: string;
  };
  is_published: boolean;
}

const THEMES = [
  { name: 'Ocean Blue', primary: '#3B82F6', secondary: '#1E40AF', background: '#FFFFFF', text: '#1F2937' },
  { name: 'Forest Green', primary: '#10B981', secondary: '#047857', background: '#FFFFFF', text: '#1F2937' },
  { name: 'Sunset Orange', primary: '#F59E0B', secondary: '#D97706', background: '#FFFFFF', text: '#1F2937' },
  { name: 'Royal Purple', primary: '#8B5CF6', secondary: '#7C3AED', background: '#FFFFFF', text: '#1F2937' },
  { name: 'Rose Pink', primary: '#EC4899', secondary: '#DB2777', background: '#FFFFFF', text: '#1F2937' },
  { name: 'Dark Mode', primary: '#60A5FA', secondary: '#3B82F6', background: '#1F2937', text: '#F9FAFB' },
];

const FONTS = ['Inter', 'Roboto', 'Open Sans', 'Lato', 'Montserrat', 'Poppins'];

export const AdminPanel: React.FC = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'basic' | 'contact' | 'social' | 'media' | 'reviews' | 'design' | 'preview'>('basic');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [cardId, setCardId] = useState<string | null>(null);
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>([]);
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [reviewLinks, setReviewLinks] = useState<ReviewLink[]>([]);
  const [newSocialLink, setNewSocialLink] = useState({ platform: 'Instagram', username: '' });
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(false);

  const [formData, setFormData] = useState<FormData>({
    title: '',
    username: '',
    globalUsername: '',
    company: '',
    tagline: '',
    profession: '',
    avatar_url: '',
    phone: '',
    whatsapp: '',
    email: user?.email || '',
    website: '',
    address: '',
    map_link: '',
    theme: THEMES[0],
    shape: 'rectangle',
    layout: {
      style: 'modern',
      alignment: 'center',
      font: 'Inter'
    },
    is_published: false
  });

  useEffect(() => {
    if (user) {
      loadUserData();
    }
  }, [user]);

  const loadUserData = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Load profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      // Load existing card
      const { data: existingCard } = await supabase
        .from('business_cards')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (existingCard) {
        setCardId(existingCard.id);
        const theme = existingCard.theme as any || THEMES[0];
        const layout = existingCard.layout as any || { style: 'modern', alignment: 'center', font: 'Inter' };

        setFormData({
          title: existingCard.title || '',
          username: existingCard.slug || '',
          globalUsername: profile?.global_username || '',
          company: existingCard.company || '',
          tagline: existingCard.bio || '',
          profession: existingCard.position || '',
          avatar_url: existingCard.avatar_url || '',
          phone: existingCard.phone || '',
          whatsapp: existingCard.whatsapp || '',
          email: existingCard.email || user.email || '',
          website: existingCard.website || '',
          address: existingCard.address || '',
          map_link: existingCard.map_link || '',
          theme,
          shape: existingCard.shape || 'rectangle',
          layout,
          is_published: existingCard.is_published || false
        });

        // Load social links
        const { data: socialData } = await supabase
          .from('social_links')
          .select('*')
          .eq('card_id', existingCard.id)
          .eq('is_active', true)
          .order('display_order');

        setSocialLinks(socialData || []);
      } else {
        // Set default values from profile
        setFormData(prev => ({
          ...prev,
          title: profile?.name || '',
          email: profile?.email || user.email || '',
          globalUsername: profile?.global_username || ''
        }));
      }
    } catch (error) {
      console.error('Error loading user data:', error);
      setMessage({ type: 'error', text: 'Failed to load your data' });
    } finally {
      setLoading(false);
    }
  };

  const generateUniqueSlug = async (baseSlug: string): Promise<string> => {
    let slug = baseSlug.toLowerCase().replace(/[^a-z0-9]/g, '');
    let counter = 0;
    let finalSlug = slug;

    // Keep checking until we find a unique slug
    while (true) {
      const { data } = await supabase
        .from('business_cards')
        .select('id')
        .eq('slug', finalSlug)
        .neq('user_id', user?.id || ''); // Exclude current user's card

      if (!data || data.length === 0) {
        break; // Slug is unique
      }

      counter++;
      finalSlug = `${slug}${counter}`;
    }

    return finalSlug;
  };

  const handleSave = async () => {
    if (!user) return;

    setSaving(true);
    setMessage(null);

    try {
      // Generate unique slug if username is provided
      let finalSlug = formData.username;
      if (finalSlug) {
        finalSlug = await generateUniqueSlug(finalSlug);
      }

      const cardData = {
        user_id: user.id,
        title: formData.title,
        company: formData.company,
        position: formData.profession,
        phone: formData.phone,
        email: formData.email,
        website: formData.website,
        avatar_url: formData.avatar_url,
        bio: formData.tagline,
        whatsapp: formData.whatsapp,
        address: formData.address,
        map_link: formData.map_link,
        theme: formData.theme,
        shape: formData.shape,
        layout: formData.layout,
        is_published: formData.is_published,
        slug: finalSlug,
        updated_at: new Date().toISOString()
      };

      let savedCard;
      if (cardId) {
        // Update existing card
        const { data, error } = await supabase
          .from('business_cards')
          .update(cardData)
          .eq('id', cardId)
          .select()
          .single();

        if (error) throw error;
        savedCard = data;
      } else {
        // Create new card
        const { data, error } = await supabase
          .from('business_cards')
          .insert(cardData)
          .select()
          .single();

        if (error) throw error;
        savedCard = data;
        setCardId(savedCard.id);
      }

      // Update profile with global username if provided
      if (formData.globalUsername) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ 
            global_username: formData.globalUsername,
            name: formData.title 
          })
          .eq('id', user.id);

        if (profileError) {
          console.error('Error updating profile:', profileError);
        }
      }

      // Update username in form data to reflect the final slug
      setFormData(prev => ({ ...prev, username: savedCard.slug || '' }));

      setMessage({ type: 'success', text: 'Card saved successfully!' });
    } catch (error: any) {
      console.error('Error saving card:', error);
      setMessage({ type: 'error', text: error.message || 'Failed to save card' });
    } finally {
      setSaving(false);
    }
  };

  const handleAddSocialLink = async () => {
    if (!cardId || !newSocialLink.username.trim()) return;

    try {
      const url = generateSocialLink(newSocialLink.platform, newSocialLink.username);
      
      const { data, error } = await supabase
        .from('social_links')
        .insert({
          card_id: cardId,
          platform: newSocialLink.platform,
          username: newSocialLink.username,
          url,
          display_order: socialLinks.length,
          is_auto_synced: false
        })
        .select()
        .single();

      if (error) throw error;

      setSocialLinks([...socialLinks, data]);
      setNewSocialLink({ platform: 'Instagram', username: '' });
      setMessage({ type: 'success', text: 'Social link added!' });
    } catch (error: any) {
      console.error('Error adding social link:', error);
      setMessage({ type: 'error', text: 'Failed to add social link' });
    }
  };

  const handleRemoveSocialLink = async (linkId: string) => {
    try {
      const { error } = await supabase
        .from('social_links')
        .delete()
        .eq('id', linkId);

      if (error) throw error;

      setSocialLinks(socialLinks.filter(link => link.id !== linkId));
      setMessage({ type: 'success', text: 'Social link removed!' });
    } catch (error: any) {
      console.error('Error removing social link:', error);
      setMessage({ type: 'error', text: 'Failed to remove social link' });
    }
  };

  const handleAutoSync = async () => {
    if (!cardId || !formData.globalUsername.trim()) {
      setMessage({ type: 'error', text: 'Please enter a global username first' });
      return;
    }

    try {
      // Remove existing auto-synced links
      await supabase
        .from('social_links')
        .delete()
        .eq('card_id', cardId)
        .eq('is_auto_synced', true);

      // Generate new auto-synced links
      const autoLinks = generateAutoSyncedLinks(formData.globalUsername);
      
      const { data, error } = await supabase
        .from('social_links')
        .insert(
          autoLinks.map((link, index) => ({
            card_id: cardId,
            platform: link.platform,
            username: link.username,
            url: link.url,
            display_order: socialLinks.length + index,
            is_auto_synced: true
          }))
        )
        .select();

      if (error) throw error;

      // Reload social links
      const { data: allLinks } = await supabase
        .from('social_links')
        .select('*')
        .eq('card_id', cardId)
        .eq('is_active', true)
        .order('display_order');

      setSocialLinks(allLinks || []);
      setAutoSyncEnabled(true);
      setMessage({ type: 'success', text: 'Auto-sync enabled! Social links updated.' });
    } catch (error: any) {
      console.error('Error enabling auto-sync:', error);
      setMessage({ type: 'error', text: 'Failed to enable auto-sync' });
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  const copyCardLink = () => {
    if (formData.username) {
      const url = `${window.location.origin}/c/${formData.username}`;
      navigator.clipboard.writeText(url).then(() => {
        setMessage({ type: 'success', text: 'Card link copied to clipboard!' });
      });
    }
  };

  const tabs = [
    { id: 'basic', label: 'Basic Info', icon: User },
    { id: 'contact', label: 'Contact', icon: Mail },
    { id: 'social', label: 'Social Links', icon: LinkIcon },
    { id: 'media', label: 'Media', icon: Video },
    { id: 'reviews', label: 'Reviews', icon: Star },
    { id: 'design', label: 'Design', icon: Palette },
    { id: 'preview', label: 'Preview', icon: Eye },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
                <CreditCard className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Digital Business Cards</h1>
                <p className="text-sm text-gray-500">Create your professional presence</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {formData.username && formData.is_published && (
                <a
                  href={`/c/${formData.username}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  View Live Card
                </a>
              )}
              
              <button
                onClick={handleLogout}
                className="inline-flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar Navigation */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sticky top-24">
              <nav className="space-y-2">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all duration-200 ${
                        activeTab === tab.id
                          ? 'bg-blue-50 text-blue-700 border-2 border-blue-200'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      {tab.label}
                    </button>
                  );
                })}
              </nav>

              {/* Quick Actions */}
              <div className="mt-8 pt-6 border-t border-gray-200">
                <h3 className="text-sm font-medium text-gray-900 mb-3">Quick Actions</h3>
                <div className="space-y-2">
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="w-full flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    {saving ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                  
                  {formData.username && (
                    <button
                      onClick={copyCardLink}
                      className="w-full flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <Copy className="w-4 h-4" />
                      Copy Link
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
              {/* Message Display */}
              {message && (
                <div className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${
                  message.type === 'success' 
                    ? 'bg-green-50 text-green-700 border border-green-200' 
                    : 'bg-red-50 text-red-700 border border-red-200'
                }`}>
                  {message.type === 'success' ? (
                    <CheckCircle className="w-5 h-5" />
                  ) : (
                    <AlertCircle className="w-5 h-5" />
                  )}
                  {message.text}
                </div>
              )}

              {/* Tab Content */}
              {activeTab === 'basic' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Basic Information</h2>
                    <p className="text-gray-600">Set up your basic profile information</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2">
                      <ImageUpload
                        currentImageUrl={formData.avatar_url}
                        onImageChange={(url) => setFormData({ ...formData, avatar_url: url || '' })}
                        userId={user?.id || ''}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Full Name *
                      </label>
                      <input
                        type="text"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Enter your full name"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Card Username *
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">
                          /c/
                        </span>
                        <input
                          type="text"
                          value={formData.username}
                          onChange={(e) => setFormData({ ...formData, username: e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '') })}
                          className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="username"
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        This will be your card's URL: /c/{formData.username || 'username'}
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Profession/Job Title
                      </label>
                      <input
                        type="text"
                        value={formData.profession}
                        onChange={(e) => setFormData({ ...formData, profession: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="e.g., Software Engineer, Marketing Manager"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Company/Organization
                      </label>
                      <input
                        type="text"
                        value={formData.company}
                        onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="e.g., Acme Corp, Freelancer"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Tagline/Bio
                      </label>
                      <textarea
                        value={formData.tagline}
                        onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
                        rows={3}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Brief description about yourself or your work"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Global Username (for auto-sync)
                      </label>
                      <input
                        type="text"
                        value={formData.globalUsername}
                        onChange={(e) => setFormData({ ...formData, globalUsername: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="your_username"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Use the same username across all social platforms for auto-sync
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'contact' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Contact Information</h2>
                    <p className="text-gray-600">Add your contact details</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Email Address
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="your.email@example.com"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Phone Number
                      </label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                          type="tel"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="+1 (555) 123-4567"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        WhatsApp Number
                      </label>
                      <div className="relative">
                        <MessageSquare className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                          type="tel"
                          value={formData.whatsapp}
                          onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="+1 (555) 123-4567"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Website
                      </label>
                      <div className="relative">
                        <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                          type="url"
                          value={formData.website}
                          onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="https://yourwebsite.com"
                        />
                      </div>
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Address
                      </label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                        <textarea
                          value={formData.address}
                          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                          rows={3}
                          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Your business address"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'social' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Social Media Links</h2>
                    <p className="text-gray-600">Connect your social media profiles</p>
                  </div>

                  {/* Auto-Sync Section */}
                  {formData.globalUsername && (
                    <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
                      <div className="flex items-center gap-3 mb-4">
                        <Zap className="w-6 h-6 text-blue-600" />
                        <h3 className="text-lg font-semibold text-blue-900">Auto-Sync Social Links</h3>
                      </div>
                      <p className="text-blue-700 mb-4">
                        Automatically generate social links using your global username: <strong>{formData.globalUsername}</strong>
                      </p>
                      <button
                        onClick={handleAutoSync}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        Enable Auto-Sync
                      </button>
                    </div>
                  )}

                  {/* Add Social Link */}
                  <div className="bg-gray-50 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Add Social Link</h3>
                    <div className="flex gap-3">
                      <select
                        value={newSocialLink.platform}
                        onChange={(e) => setNewSocialLink({ ...newSocialLink, platform: e.target.value })}
                        className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        {Object.keys(SOCIAL_PLATFORMS).map((platform) => (
                          <option key={platform} value={platform}>
                            {platform}
                          </option>
                        ))}
                      </select>
                      <input
                        type="text"
                        value={newSocialLink.username}
                        onChange={(e) => setNewSocialLink({ ...newSocialLink, username: e.target.value })}
                        className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder={SOCIAL_PLATFORMS[newSocialLink.platform]?.placeholder || 'username'}
                      />
                      <button
                        onClick={handleAddSocialLink}
                        disabled={!cardId || !newSocialLink.username.trim()}
                        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                      >
                        <Plus className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  {/* Social Links List */}
                  {socialLinks.length > 0 ? (
                    <div className="space-y-3">
                      {socialLinks.map((link) => {
                        const Icon = SOCIAL_ICONS[link.platform] || Globe;
                        return (
                          <div
                            key={link.id}
                            className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl"
                          >
                            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                              <Icon className="w-5 h-5 text-blue-600" />
                            </div>
                            <div className="flex-1">
                              <p className="font-medium text-gray-900">{link.platform}</p>
                              <p className="text-sm text-gray-500">{link.username}</p>
                              {link.is_auto_synced && (
                                <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs">
                                  <Zap className="w-3 h-3" />
                                  Auto-synced
                                </span>
                              )}
                            </div>
                            <div className="flex gap-2">
                              <a
                                href={link.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </a>
                              <button
                                onClick={() => handleRemoveSocialLink(link.id)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No Social Links</h3>
                      <p className="text-gray-600">Add your social media profiles to connect with your audience</p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'media' && cardId && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Media Gallery</h2>
                    <p className="text-gray-600">Add videos and media to showcase your work</p>
                  </div>

                  <MediaUpload
                    cardId={cardId}
                    mediaItems={mediaItems}
                    onMediaChange={setMediaItems}
                    userId={user?.id || ''}
                  />
                </div>
              )}

              {activeTab === 'reviews' && cardId && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Customer Reviews</h2>
                    <p className="text-gray-600">Add links to your reviews and testimonials</p>
                  </div>

                  <ReviewsManager
                    cardId={cardId}
                    reviews={reviewLinks}
                    onReviewsChange={setReviewLinks}
                  />
                </div>
              )}

              {activeTab === 'design' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Design & Layout</h2>
                    <p className="text-gray-600">Customize the appearance of your card</p>
                  </div>

                  {/* Theme Selection */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Color Theme</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {THEMES.map((theme) => (
                        <button
                          key={theme.name}
                          onClick={() => setFormData({ ...formData, theme })}
                          className={`p-4 rounded-xl border-2 transition-all duration-200 ${
                            formData.theme.name === theme.name
                              ? 'border-blue-500 ring-2 ring-blue-200'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="flex items-center gap-3 mb-2">
                            <div
                              className="w-6 h-6 rounded-full"
                              style={{ backgroundColor: theme.primary }}
                            />
                            <div
                              className="w-6 h-6 rounded-full"
                              style={{ backgroundColor: theme.secondary }}
                            />
                          </div>
                          <p className="text-sm font-medium text-gray-900">{theme.name}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Shape Selection */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Card Shape</h3>
                    <div className="grid grid-cols-3 gap-4">
                      {[
                        { value: 'rectangle', label: 'Rectangle' },
                        { value: 'rounded', label: 'Rounded' },
                        { value: 'circle', label: 'Circle' }
                      ].map((shape) => (
                        <button
                          key={shape.value}
                          onClick={() => setFormData({ ...formData, shape: shape.value })}
                          className={`p-4 rounded-xl border-2 transition-all duration-200 ${
                            formData.shape === shape.value
                              ? 'border-blue-500 ring-2 ring-blue-200'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div
                            className={`w-12 h-8 mx-auto mb-2 bg-gray-300 ${
                              shape.value === 'rectangle' ? '' :
                              shape.value === 'rounded' ? 'rounded-lg' : 'rounded-full'
                            }`}
                          />
                          <p className="text-sm font-medium text-gray-900">{shape.label}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Font Selection */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Font Family</h3>
                    <select
                      value={formData.layout.font}
                      onChange={(e) => setFormData({
                        ...formData,
                        layout: { ...formData.layout, font: e.target.value }
                      })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      {FONTS.map((font) => (
                        <option key={font} value={font} style={{ fontFamily: font }}>
                          {font}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Layout Style */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Layout Style</h3>
                    <div className="grid grid-cols-3 gap-4">
                      {[
                        { value: 'modern', label: 'Modern' },
                        { value: 'classic', label: 'Classic' },
                        { value: 'minimal', label: 'Minimal' }
                      ].map((style) => (
                        <button
                          key={style.value}
                          onClick={() => setFormData({
                            ...formData,
                            layout: { ...formData.layout, style: style.value }
                          })}
                          className={`p-4 rounded-xl border-2 transition-all duration-200 ${
                            formData.layout.style === style.value
                              ? 'border-blue-500 ring-2 ring-blue-200'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <Layout className="w-8 h-8 mx-auto mb-2 text-gray-600" />
                          <p className="text-sm font-medium text-gray-900">{style.label}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Publish Toggle */}
                  <div className="bg-green-50 rounded-xl p-6 border border-green-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-semibold text-green-900">Publish Card</h3>
                        <p className="text-green-700">Make your card publicly accessible</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.is_published}
                          onChange={(e) => setFormData({ ...formData, is_published: e.target.checked })}
                          className="sr-only peer"
                        />
                        <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'preview' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Card Preview</h2>
                    <p className="text-gray-600">See how your card will look to visitors</p>
                  </div>

                  <CardPreview
                    formData={formData}
                    socialLinks={socialLinks}
                    mediaItems={mediaItems}
                    reviews={reviewLinks}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
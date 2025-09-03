import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  Mail,
  Phone,
  Globe,
  Instagram,
  Linkedin,
  Github,
  Twitter,
  Facebook,
  Youtube,
  Camera,
  MessageCircle,
  MapPin,
  Star,
  ExternalLink,
  Play,
  FileText,
  Eye,
  Download,
  Share2,
  QrCode,
  ArrowLeft
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Database } from '../lib/supabase';
import html2canvas from 'html2canvas';

type BusinessCard = Database['public']['Tables']['business_cards']['Row'];
type SocialLink = Database['public']['Tables']['social_links']['Row'];

interface MediaItem {
  id: string;
  type: 'image' | 'video' | 'document';
  url: string;
  title: string;
  description?: string;
  thumbnail_url?: string;
}

interface ReviewLink {
  id: string;
  title: string;
  review_url: string;
  created_at: string;
}

const SOCIAL_ICONS: Record<string, React.ComponentType<any>> = {
  Instagram,
  LinkedIn: Linkedin,
  GitHub: Github,
  Twitter,
  Facebook,
  'You Tube': Youtube,
  YouTube: Youtube,
  Website: Globe,
  WhatsApp: MessageCircle,
  Telegram: MessageCircle,
  'Custom Link': ExternalLink,
};

export const PublicCard: React.FC = () => {
  const { cardId } = useParams<{ cardId: string }>();
  const [card, setCard] = useState<BusinessCard | null>(null);
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>([]);
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [reviewLinks, setReviewLinks] = useState<ReviewLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showQR, setShowQR] = useState(false);

  useEffect(() => {
    if (cardId) {
      loadCard();
    }
  }, [cardId]);

  const loadCard = async () => {
    try {
      setLoading(true);
      setError(null);

      // First try to find card by slug (username)
      let { data: cardData, error: cardError } = await supabase
        .from('business_cards')
        .select(`
          *,
          profiles (
            name,
            email,
            avatar_url
          )
        `)
        .eq('slug', cardId)
        .eq('is_published', true)
        .single();

      // If not found by slug, try by ID as fallback
      if (cardError && cardError.code === 'PGRST116') {
        const { data: cardByIdData, error: cardByIdError } = await supabase
          .from('business_cards')
          .select(`
            *,
            profiles (
              name,
              email,
              avatar_url
            )
          `)
          .eq('id', cardId)
          .eq('is_published', true)
          .single();

        cardData = cardByIdData;
        cardError = cardByIdError;
      }

      if (cardError) {
        console.error('Card error:', cardError);
        setError('Card not found or not published');
        return;
      }

      if (!cardData) {
        setError('Card not found or not published');
        return;
      }

      setCard(cardData);

      // Load social links
      const { data: socialData, error: socialError } = await supabase
        .from('social_links')
        .select('*')
        .eq('card_id', cardData.id)
        .eq('is_active', true)
        .order('display_order');

      if (socialError) {
        console.error('Social links error:', socialError);
      } else {
        setSocialLinks(socialData || []);
      }

      // Load media items
      const { data: mediaData, error: mediaError } = await supabase
        .from('media_items')
        .select('*')
        .eq('card_id', cardData.id)
        .eq('is_active', true)
        .order('display_order');

      if (mediaError) {
        console.error('Media error:', mediaError);
      } else {
        const formattedMedia: MediaItem[] = (mediaData || []).map(item => ({
          id: item.id,
          type: item.type as 'image' | 'video' | 'document',
          url: item.url,
          title: item.title,
          description: item.description || undefined,
          thumbnail_url: item.thumbnail_url || undefined
        }));
        setMediaItems(formattedMedia);
      }

      // Load review links
      const { data: reviewData, error: reviewError } = await supabase
        .from('review_links')
        .select('*')
        .eq('card_id', cardData.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (reviewError) {
        console.error('Review links error:', reviewError);
      } else {
        const formattedReviews: ReviewLink[] = (reviewData || []).map(item => ({
          id: item.id,
          title: item.title,
          review_url: item.review_url,
          created_at: item.created_at
        }));
        setReviewLinks(formattedReviews);
      }

      // Track view
      await trackView(cardData.id);

    } catch (error) {
      console.error('Error loading card:', error);
      setError('Failed to load card');
    } finally {
      setLoading(false);
    }
  };

  const trackView = async (cardId: string) => {
    try {
      // Insert view record
      await supabase
        .from('card_views')
        .insert({
          card_id: cardId,
          visitor_ip: null, // Could be enhanced with IP detection
          user_agent: navigator.userAgent,
          referrer: document.referrer || null,
          device_type: /Mobile|Android|iPhone|iPad/.test(navigator.userAgent) ? 'mobile' : 'desktop'
        });

      // Update view count
      await supabase
        .from('business_cards')
        .update({ 
          view_count: (card?.view_count || 0) + 1 
        })
        .eq('id', cardId);

    } catch (error) {
      console.error('Error tracking view:', error);
    }
  };

  const handleDownload = async () => {
    const cardElement = document.getElementById('public-card-content');
    if (!cardElement) return;

    try {
      const canvas = await html2canvas(cardElement, {
        backgroundColor: null,
        useCORS: true,
        scale: 2,
      });
      const link = document.createElement('a');
      link.download = `${card?.slug || 'business-card'}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (error) {
      console.error('Error downloading card:', error);
      alert('Failed to download card. Please try again.');
    }
  };

  const handleShare = async () => {
    const url = window.location.href;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${card?.title || 'Business Card'}`,
          text: `Check out ${card?.title || 'this'}'s digital business card`,
          url: url,
        });
      } catch (error) {
        console.error('Error sharing:', error);
      }
    } else {
      // Fallback: copy to clipboard
      try {
        await navigator.clipboard.writeText(url);
        alert('Link copied to clipboard!');
      } catch (error) {
        console.error('Error copying to clipboard:', error);
        alert('Failed to copy link. Please copy the URL manually.');
      }
    }
  };

  const getVideoThumbnail = (url: string) => {
    if (url.includes('youtube.com/watch?v=')) {
      const videoId = url.split('v=')[1]?.split('&')[0];
      return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
    }
    if (url.includes('youtu.be/')) {
      const videoId = url.split('youtu.be/')[1]?.split('?')[0];
      return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
    }
    return null;
  };

  const getVideoEmbedUrl = (url: string) => {
    if (url.includes('youtube.com/watch?v=')) {
      const videoId = url.split('v=')[1]?.split('&')[0];
      return `https://www.youtube.com/embed/${videoId}`;
    }
    if (url.includes('youtu.be/')) {
      const videoId = url.split('youtu.be/')[1]?.split('?')[0];
      return `https://www.youtube.com/embed/${videoId}`;
    }
    if (url.includes('vimeo.com/')) {
      const videoId = url.split('vimeo.com/')[1]?.split('?')[0];
      return `https://player.vimeo.com/video/${videoId}`;
    }
    return url;
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 ${
          i < rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
        }`}
      />
    ));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading card...</p>
        </div>
      </div>
    );
  }

  if (error || !card) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Eye className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Card Not Found</h1>
          <p className="text-gray-600 mb-6">
            {error || 'Card not found or not published'}
          </p>
          <p className="text-sm text-gray-500 mb-6">
            If you're the owner of this card, make sure it's published in your admin panel.
          </p>
          <button
            onClick={() => window.history.back()}
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const theme = typeof card.theme === 'object' && card.theme !== null ? card.theme as any : {
    primary: '#3B82F6',
    secondary: '#1E40AF',
    background: '#FFFFFF',
    text: '#1F2937',
    name: 'Default'
  };

  const layout = typeof card.layout === 'object' && card.layout !== null ? card.layout as any : {
    style: 'modern',
    alignment: 'center',
    font: 'Inter'
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header with actions */}
      <div className="sticky top-0 bg-white/80 backdrop-blur-lg border-b border-gray-200 z-40">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => window.history.back()}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div>
              <h1 className="font-semibold text-gray-900">{card.title || 'Business Card'}</h1>
              <p className="text-sm text-gray-500">
                {card.company && card.position ? `${card.position} at ${card.company}` : card.company || card.position}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowQR(!showQR)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Show QR Code"
            >
              <QrCode className="w-5 h-5 text-gray-600" />
            </button>
            <button
              onClick={handleShare}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Share Card"
            >
              <Share2 className="w-5 h-5 text-gray-600" />
            </button>
            <button
              onClick={handleDownload}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Download Card"
            >
              <Download className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>
      </div>

      {/* QR Code Modal */}
      {showQR && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">QR Code</h3>
              <div className="flex justify-center mb-4">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(window.location.href)}`}
                  alt="QR Code"
                  className="w-48 h-48 border border-gray-200 rounded-lg"
                />
              </div>
              <p className="text-sm text-gray-600 mb-4">
                Scan to share this card
              </p>
              <button
                onClick={() => setShowQR(false)}
                className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div id="public-card-content" className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Profile Section */}
          <div className="lg:col-span-1">
            <div
              className="p-8 rounded-3xl shadow-2xl border border-gray-100"
              style={{
                backgroundColor: theme.background,
                color: theme.text,
                fontFamily: `'${layout.font}', sans-serif`,
              }}
            >
              {/* Avatar */}
              <div className="text-center mb-6">
                {card.avatar_url ? (
                  <img
                    src={card.avatar_url}
                    alt="Profile"
                    className="w-32 h-32 rounded-full object-cover mx-auto border-4 shadow-lg"
                    style={{ borderColor: theme.primary }}
                  />
                ) : (
                  <div
                    className="w-32 h-32 rounded-full mx-auto flex items-center justify-center text-white font-bold text-3xl border-4 shadow-lg"
                    style={{
                      backgroundColor: theme.primary,
                      borderColor: theme.secondary,
                    }}
                  >
                    {card.title ? (
                      card.title.charAt(0).toUpperCase()
                    ) : (
                      <Camera className="w-12 h-12" />
                    )}
                  </div>
                )}
              </div>

              {/* Name and Bio */}
              <div className="text-center mb-6">
                <h2
                  className="text-2xl font-bold mb-2"
                  style={{ color: theme.text }}
                >
                  {card.title || 'Professional'}
                </h2>
                {card.position && (
                  <p
                    className="text-lg font-medium mb-1"
                    style={{ color: theme.secondary }}
                  >
                    {card.position}
                  </p>
                )}
                {card.company && (
                  <p
                    className="text-base opacity-80 mb-2"
                    style={{ color: theme.text }}
                  >
                    {card.company}
                  </p>
                )}
                {card.bio && (
                  <p
                    className="text-sm opacity-70"
                    style={{ color: theme.text }}
                  >
                    {card.bio}
                  </p>
                )}
              </div>

              {/* Contact Info */}
              <div className="space-y-3 mb-6">
                {card.email && (
                  <a
                    href={`mailto:${card.email}`}
                    className="flex items-center gap-3 p-3 rounded-lg transition-colors hover:bg-black hover:bg-opacity-5"
                  >
                    <Mail
                      className="w-5 h-5"
                      style={{ color: theme.primary }}
                    />
                    <span className="text-sm">{card.email}</span>
                  </a>
                )}
                {card.phone && (
                  <a
                    href={`tel:${card.phone}`}
                    className="flex items-center gap-3 p-3 rounded-lg transition-colors hover:bg-black hover:bg-opacity-5"
                  >
                    <Phone
                      className="w-5 h-5"
                      style={{ color: theme.primary }}
                    />
                    <span className="text-sm">{card.phone}</span>
                  </a>
                )}
                {card.whatsapp && (
                  <a
                    href={`https://wa.me/${card.whatsapp.replace(/[^0-9]/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 rounded-lg transition-colors hover:bg-black hover:bg-opacity-5"
                  >
                    <MessageCircle
                      className="w-5 h-5"
                      style={{ color: theme.primary }}
                    />
                    <span className="text-sm">WhatsApp</span>
                  </a>
                )}
                {card.website && (
                  <a
                    href={card.website.startsWith('http') ? card.website : `https://${card.website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 rounded-lg transition-colors hover:bg-black hover:bg-opacity-5"
                  >
                    <Globe
                      className="w-5 h-5"
                      style={{ color: theme.primary }}
                    />
                    <span className="text-sm">{card.website}</span>
                  </a>
                )}
                {card.address && (
                  <div className="flex items-start gap-3 p-3 rounded-lg">
                    <MapPin
                      className="w-5 h-5 mt-0.5"
                      style={{ color: theme.primary }}
                    />
                    <span className="text-sm">{card.address}</span>
                  </div>
                )}
              </div>

              {/* Social Links */}
              {socialLinks.length > 0 && (
                <div className="flex gap-3 flex-wrap justify-center">
                  {socialLinks.map((link) => {
                    const Icon = SOCIAL_ICONS[link.platform] || Globe;
                    return (
                      <a
                        key={link.id}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-12 h-12 rounded-full flex items-center justify-center hover:scale-110 transition-transform shadow-lg"
                        style={{ backgroundColor: theme.primary }}
                        title={link.platform}
                      >
                        <Icon className="w-6 h-6 text-white" />
                      </a>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Content Section */}
          <div className="lg:col-span-2 space-y-8">
            {/* Media Gallery */}
            {mediaItems.length > 0 && (
              <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Play className="w-5 h-5 text-blue-600" />
                  Media Gallery
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {mediaItems.map((item) => (
                    <div key={item.id} className="relative group">
                      {item.type === 'video' ? (
                        <div className="relative">
                          {getVideoThumbnail(item.url) ? (
                            <img
                              src={getVideoThumbnail(item.url)!}
                              alt={item.title}
                              className="w-full h-48 object-cover rounded-lg"
                            />
                          ) : (
                            <div className="w-full h-48 bg-gray-200 rounded-lg flex items-center justify-center">
                              <Play className="w-12 h-12 text-gray-600" />
                            </div>
                          )}
                          <div className="absolute inset-0 bg-black bg-opacity-30 rounded-lg flex items-center justify-center">
                            <a
                              href={item.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="w-16 h-16 bg-white bg-opacity-90 rounded-full flex items-center justify-center hover:bg-opacity-100 transition-all"
                            >
                              <Play className="w-8 h-8 text-gray-800 ml-1" />
                            </a>
                          </div>
                        </div>
                      ) : item.type === 'image' ? (
                        <img
                          src={item.url}
                          alt={item.title}
                          className="w-full h-48 object-cover rounded-lg"
                        />
                      ) : (
                        <div className="w-full h-48 bg-gray-100 rounded-lg flex items-center justify-center">
                          <FileText className="w-12 h-12 text-gray-600" />
                        </div>
                      )}
                      <div className="mt-2">
                        <h4 className="font-medium text-gray-900 text-sm">{item.title}</h4>
                        {item.description && (
                          <p className="text-xs text-gray-600">{item.description}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Review Links */}
            {reviewLinks.length > 0 && (
              <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Star className="w-5 h-5 text-yellow-600" />
                  Reviews & Testimonials
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {reviewLinks.map((review) => (
                    <a
                      key={review.id}
                      href={review.review_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block p-4 border border-gray-200 rounded-xl hover:shadow-md transition-shadow group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-yellow-50 rounded-lg flex items-center justify-center">
                          <Star className="w-5 h-5 text-yellow-600" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
                            {review.title}
                          </h4>
                          <p className="text-sm text-gray-500">
                            View reviews and testimonials
                          </p>
                        </div>
                        <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-blue-600 transition-colors" />
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Contact Actions */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Get In Touch</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {card.email && (
                  <a
                    href={`mailto:${card.email}`}
                    className="flex items-center gap-3 p-4 border border-gray-200 rounded-xl hover:shadow-md transition-shadow group"
                  >
                    <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                      <Mail className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
                        Send Email
                      </p>
                      <p className="text-sm text-gray-500">{card.email}</p>
                    </div>
                  </a>
                )}
                {card.phone && (
                  <a
                    href={`tel:${card.phone}`}
                    className="flex items-center gap-3 p-4 border border-gray-200 rounded-xl hover:shadow-md transition-shadow group"
                  >
                    <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
                      <Phone className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 group-hover:text-green-600 transition-colors">
                        Call Now
                      </p>
                      <p className="text-sm text-gray-500">{card.phone}</p>
                    </div>
                  </a>
                )}
                {card.whatsapp && (
                  <a
                    href={`https://wa.me/${card.whatsapp.replace(/[^0-9]/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-4 border border-gray-200 rounded-xl hover:shadow-md transition-shadow group"
                  >
                    <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
                      <MessageCircle className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 group-hover:text-green-600 transition-colors">
                        WhatsApp
                      </p>
                      <p className="text-sm text-gray-500">Send message</p>
                    </div>
                  </a>
                )}
                {card.website && (
                  <a
                    href={card.website.startsWith('http') ? card.website : `https://${card.website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-4 border border-gray-200 rounded-xl hover:shadow-md transition-shadow group"
                  >
                    <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center">
                      <Globe className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 group-hover:text-purple-600 transition-colors">
                        Visit Website
                      </p>
                      <p className="text-sm text-gray-500">{card.website}</p>
                    </div>
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Additional Content */}
          <div className="lg:col-span-2">
            {/* Empty state when no additional content */}
            {mediaItems.length === 0 && reviewLinks.length === 0 && (
              <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-12 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Eye className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Professional Profile
                </h3>
                <p className="text-gray-600">
                  Connect with {card.title || 'this professional'} using the contact information provided.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-12 pt-8 border-t border-gray-200">
          <p className="text-sm text-gray-500">
            Powered by Digital Business Cards
          </p>
          <div className="flex items-center justify-center gap-2 mt-2">
            <Eye className="w-4 h-4 text-gray-400" />
            <span className="text-xs text-gray-400">
              {card.view_count || 0} views
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  CreditCard,
  User,
  Mail,
  Phone,
  Globe,
  Camera,
  Palette,
  Layout,
  Eye,
  Save,
  LogOut,
  Plus,
  Trash2,
  Settings,
  Download,
  Share2,
  QrCode,
  ExternalLink,
  MessageCircle,
  MapPin,
  Building,
  Briefcase,
  FileText,
  Star,
  Video,
  Image as ImageIcon,
  Link as LinkIcon,
  Users,
  BarChart3,
  CheckCircle,
  AlertCircle,
  Copy,
  Loader2,
} from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { supabase } from "../lib/supabase";
import { ImageUpload } from "./ImageUpload";
import { CardPreview } from "./CardPreview";
import { MediaUpload } from "./MediaUpload";
import { ReviewsManager } from "./ReviewsManager";
import type { Database } from "../lib/supabase";
import {
  SOCIAL_PLATFORMS,
  generateSocialLink,
  generateAutoSyncedLinks,
} from "../utils/socialUtils";

type SocialLink = Database["public"]["Tables"]["social_links"]["Row"];

interface MediaItem {
  id: string;
  type: "image" | "video" | "document";
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
  {
    name: "Ocean Blue",
    primary: "#3B82F6",
    secondary: "#1E40AF",
    background: "#FFFFFF",
    text: "#1F2937",
  },
  {
    name: "Forest Green",
    primary: "#10B981",
    secondary: "#047857",
    background: "#FFFFFF",
    text: "#1F2937",
  },
  {
    name: "Sunset Orange",
    primary: "#F59E0B",
    secondary: "#D97706",
    background: "#FFFFFF",
    text: "#1F2937",
  },
  {
    name: "Royal Purple",
    primary: "#8B5CF6",
    secondary: "#7C3AED",
    background: "#FFFFFF",
    text: "#1F2937",
  },
  {
    name: "Rose Pink",
    primary: "#EC4899",
    secondary: "#DB2777",
    background: "#FFFFFF",
    text: "#1F2937",
  },
  {
    name: "Dark Mode",
    primary: "#60A5FA",
    secondary: "#3B82F6",
    background: "#1F2937",
    text: "#F9FAFB",
  },
];

const FONTS = [
  "Inter",
  "Roboto",
  "Open Sans",
  "Lato",
  "Montserrat",
  "Poppins",
  "Source Sans Pro",
  "Nunito",
];

export const AdminPanel: React.FC = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("basic");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [cardId, setCardId] = useState<string | null>(null);
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>([]);
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [reviewLinks, setReviewLinks] = useState<ReviewLink[]>([]);
  const [newSocialLink, setNewSocialLink] = useState({
    platform: "Instagram",
    username: "",
  });
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(
    null
  );
  const [checkingUsername, setCheckingUsername] = useState(false);

  const [formData, setFormData] = useState<FormData>({
    title: "",
    username: "",
    globalUsername: "",
    company: "",
    tagline: "",
    profession: "",
    avatar_url: "",
    phone: "",
    whatsapp: "",
    email: user?.email || "",
    website: "",
    address: "",
    map_link: "",
    theme: THEMES[0],
    shape: "rectangle",
    layout: {
      style: "modern",
      alignment: "center",
      font: "Inter",
    },
    is_published: false,
  });

  useEffect(() => {
    if (user) {
      loadUserData();
    }
  }, [user]);

  useEffect(() => {
    if (formData.username && formData.username.length >= 3) {
      checkUsernameAvailability();
    } else {
      setUsernameAvailable(null);
    }
  }, [formData.username]);

  const checkUsernameAvailability = async () => {
    if (!formData.username || formData.username.length < 3) return;

    setCheckingUsername(true);
    try {
      const { data, error } = await supabase
        .from("business_cards")
        .select("id")
        .eq("slug", formData.username)
        .neq("user_id", user?.id || "");

      if (error) {
        console.error("Error checking username:", error);
        setUsernameAvailable(null);
        return;
      }

      setUsernameAvailable(data.length === 0);
    } catch (error) {
      console.error("Error checking username:", error);
      setUsernameAvailable(null);
    } finally {
      setCheckingUsername(false);
    }
  };

  const loadUserData = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Load profile
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (profileError) {
        console.error("Profile error:", profileError);
      }

      // Load business card
      const { data: cardData, error: cardError } = await supabase
        .from("business_cards")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (cardError && cardError.code !== "PGRST116") {
        console.error("Card error:", cardError);
      }

      if (cardData) {
        setCardId(cardData.id);
        const theme =
          typeof cardData.theme === "object" && cardData.theme !== null
            ? (cardData.theme as any)
            : THEMES[0];
        const layout =
          typeof cardData.layout === "object" && cardData.layout !== null
            ? (cardData.layout as any)
            : { style: "modern", alignment: "center", font: "Inter" };

        setFormData({
          title: cardData.title || "",
          username: cardData.slug || "",
          globalUsername: profile?.global_username || "",
          company: cardData.company || "",
          tagline: cardData.bio || "",
          profession: cardData.position || "",
          avatar_url: cardData.avatar_url || "",
          phone: cardData.phone || "",
          whatsapp: cardData.whatsapp || "",
          email: cardData.email || user.email || "",
          website: cardData.website || "",
          address: cardData.address || "",
          map_link: cardData.map_link || "",
          theme,
          shape: cardData.shape || "rectangle",
          layout,
          is_published: cardData.is_published || false,
        });

        // Load social links
        const { data: socialData, error: socialError } = await supabase
          .from("social_links")
          .select("*")
          .eq("card_id", cardData.id)
          .eq("is_active", true)
          .order("display_order");

        if (socialError) {
          console.error("Social links error:", socialError);
        } else {
          setSocialLinks(socialData || []);
        }
      } else {
        // Set default email from user
        setFormData((prev) => ({
          ...prev,
          email: user.email || "",
          globalUsername: profile?.global_username || "",
        }));
      }
    } catch (error) {
      console.error("Error loading user data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;

    setSaving(true);
    try {
      // Validate required fields
      if (!formData.title.trim()) {
        alert("Please enter your name");
        setSaving(false);
        return;
      }

      if (!formData.username.trim()) {
        alert("Please enter a username");
        setSaving(false);
        return;
      }

      if (formData.username.length < 3) {
        alert("Username must be at least 3 characters long");
        setSaving(false);
        return;
      }

      if (usernameAvailable === false) {
        alert("Username is already taken. Please choose a different one.");
        setSaving(false);
        return;
      }

      // Update profile with global username
      if (formData.globalUsername) {
        const { error: profileError } = await supabase
          .from("profiles")
          .update({
            name: formData.title,
            global_username: formData.globalUsername,
          })
          .eq("id", user.id);

        if (profileError) {
          console.error("Profile update error:", profileError);
        }
      }

      const cardData = {
        user_id: user.id,
        title: formData.title,
        company: formData.company,
        position: formData.profession,
        phone: formData.phone,
        whatsapp: formData.whatsapp,
        email: formData.email,
        website: formData.website,
        address: formData.address,
        map_link: formData.map_link,
        avatar_url: formData.avatar_url,
        bio: formData.tagline,
        theme: formData.theme,
        shape: formData.shape,
        layout: formData.layout,
        is_published: formData.is_published,
        slug: formData.username,
        updated_at: new Date().toISOString(),
      };

      if (cardId) {
        // Update existing card
        const { error } = await supabase
          .from("business_cards")
          .update(cardData)
          .eq("id", cardId);

        if (error) {
          console.error("Update error:", error);
          alert("Failed to update card. Please try again.");
          return;
        }
      } else {
        // Create new card
        const { data, error } = await supabase
          .from("business_cards")
          .insert(cardData)
          .select()
          .single();

        if (error) {
          console.error("Insert error:", error);
          alert("Failed to create card. Please try again.");
          return;
        }

        setCardId(data.id);
      }

      // Handle auto-sync for global username
      if (formData.globalUsername && formData.globalUsername !== "") {
        await handleAutoSyncSocialLinks();
      }

      setShowSuccessMessage(true);
      setTimeout(() => setShowSuccessMessage(false), 3000);
    } catch (error) {
      console.error("Save error:", error);
      alert("An unexpected error occurred. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleAutoSyncSocialLinks = async () => {
    if (!cardId || !formData.globalUsername) return;

    try {
      // Remove existing auto-synced links
      await supabase
        .from("social_links")
        .delete()
        .eq("card_id", cardId)
        .eq("is_auto_synced", true);

      // Generate new auto-synced links
      const autoSyncedLinks = generateAutoSyncedLinks(formData.globalUsername);

      // Insert new auto-synced links
      const linksToInsert = autoSyncedLinks.map((link, index) => ({
        card_id: cardId,
        platform: link.platform,
        username: link.username,
        url: link.url,
        display_order: socialLinks.length + index,
        is_active: true,
        is_auto_synced: true,
      }));

      if (linksToInsert.length > 0) {
        const { error } = await supabase
          .from("social_links")
          .insert(linksToInsert);

        if (error) {
          console.error("Auto-sync error:", error);
        } else {
          // Reload social links
          const { data: socialData } = await supabase
            .from("social_links")
            .select("*")
            .eq("card_id", cardId)
            .eq("is_active", true)
            .order("display_order");

          setSocialLinks(socialData || []);
        }
      }
    } catch (error) {
      console.error("Auto-sync error:", error);
    }
  };

  const handleAddSocialLink = async () => {
    if (!cardId || !newSocialLink.username.trim()) return;

    try {
      const url = generateSocialLink(
        newSocialLink.platform,
        newSocialLink.username
      );

      const { data, error } = await supabase
        .from("social_links")
        .insert({
          card_id: cardId,
          platform: newSocialLink.platform,
          username: newSocialLink.username,
          url,
          display_order: socialLinks.length,
          is_active: true,
          is_auto_synced: false,
        })
        .select()
        .single();

      if (error) {
        console.error("Social link error:", error);
        alert("Failed to add social link. Please try again.");
        return;
      }

      setSocialLinks([...socialLinks, data]);
      setNewSocialLink({ platform: "Instagram", username: "" });
    } catch (error) {
      console.error("Error adding social link:", error);
      alert("Failed to add social link. Please try again.");
    }
  };

  const handleRemoveSocialLink = async (linkId: string) => {
    try {
      const { error } = await supabase
        .from("social_links")
        .delete()
        .eq("id", linkId);

      if (error) {
        console.error("Remove social link error:", error);
        alert("Failed to remove social link. Please try again.");
        return;
      }

      setSocialLinks(socialLinks.filter((link) => link.id !== linkId));
    } catch (error) {
      console.error("Error removing social link:", error);
      alert("Failed to remove social link. Please try again.");
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  const copyCardLink = () => {
    const link = `${window.location.origin}/c/${formData.username}`;
    navigator.clipboard.writeText(link);
    alert("Card link copied to clipboard!");
  };

  const openCardPreview = () => {
    if (formData.username) {
      window.open(`/c/${formData.username}`, "_blank");
    }
  };

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
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
                <CreditCard className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  Digital Business Card
                </h1>
                <p className="text-sm text-gray-500">
                  Create and manage your professional card
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {/* Success Message */}
              {showSuccessMessage && (
                <div className="flex items-center gap-2 px-4 py-2 bg-green-100 text-green-800 rounded-lg">
                  <CheckCircle className="w-4 h-4" />
                  <span className="text-sm font-medium">Card saved!</span>
                </div>
              )}

              {/* Card Actions */}
              {formData.username && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={copyCardLink}
                    className="flex items-center gap-2 px-3 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Copy card link"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  <button
                    onClick={openCardPreview}
                    className="flex items-center gap-2 px-3 py-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                    title="View live card"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                </div>
              )}

              <div className="flex items-center gap-3 px-4 py-2 bg-gray-50 rounded-lg">
                <User className="w-5 h-5 text-gray-600" />
                <span className="text-sm font-medium text-gray-700">
                  {user?.email}
                </span>
              </div>

              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span className="text-sm font-medium">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Panel - Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Tab Navigation */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-1">
              <div className="flex space-x-1">
                {[
                  { id: "basic", label: "Basic Info", icon: User },
                  { id: "contact", label: "Contact", icon: Phone },
                  { id: "social", label: "Social", icon: Share2 },
                  { id: "media", label: "Media", icon: Video },
                  { id: "reviews", label: "Reviews", icon: Star },
                  { id: "design", label: "Design", icon: Palette },
                ].map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                        activeTab === tab.id
                          ? "bg-blue-600 text-white shadow-md"
                          : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="hidden sm:inline">{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Form Content */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              {/* Basic Information Tab */}
              {activeTab === "basic" && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 mb-4">
                      Basic Information
                    </h2>
                    <p className="text-gray-600 mb-6">
                      Enter your basic profile information that will appear on
                      your digital business card.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Profile Image */}
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Profile Image
                      </label>
                      <ImageUpload
                        currentImageUrl={formData.avatar_url}
                        onImageChange={(url) =>
                          setFormData({ ...formData, avatar_url: url || "" })
                        }
                        userId={user?.id || ""}
                      />
                    </div>

                    {/* Full Name */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Full Name *
                      </label>
                      <input
                        type="text"
                        value={formData.title}
                        onChange={(e) =>
                          setFormData({ ...formData, title: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Enter your full name"
                        required
                      />
                    </div>

                    {/* Username */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Username *
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={formData.username}
                          onChange={(e) => {
                            const value = e.target.value
                              .toLowerCase()
                              .replace(/[^a-z0-9-]/g, "");
                            setFormData({ ...formData, username: value });
                          }}
                          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                            usernameAvailable === false
                              ? "border-red-300"
                              : usernameAvailable === true
                              ? "border-green-300"
                              : "border-gray-300"
                          }`}
                          placeholder="your-username"
                          required
                          minLength={3}
                        />
                        {checkingUsername && (
                          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                            <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                          </div>
                        )}
                      </div>
                      <div className="mt-1 flex items-center gap-2">
                        <span className="text-xs text-gray-500">
                          Your card will be available at: /c/{formData.username}
                        </span>
                        {usernameAvailable === true && (
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        )}
                        {usernameAvailable === false && (
                          <AlertCircle className="w-4 h-4 text-red-500" />
                        )}
                      </div>
                      {usernameAvailable === false && (
                        <p className="text-xs text-red-600 mt-1">
                          Username is already taken
                        </p>
                      )}
                    </div>

                    {/* Global Username */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Global Username
                      </label>
                      <input
                        type="text"
                        value={formData.globalUsername}
                        onChange={(e) => {
                          const value = e.target.value
                            .toLowerCase()
                            .replace(/[^a-z0-9_]/g, "");
                          setFormData({ ...formData, globalUsername: value });
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="global_username"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Auto-sync social media links across platforms
                      </p>
                    </div>

                    {/* Company */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Company
                      </label>
                      <input
                        type="text"
                        value={formData.company}
                        onChange={(e) =>
                          setFormData({ ...formData, company: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Your company name"
                      />
                    </div>

                    {/* Profession */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Job Title
                      </label>
                      <input
                        type="text"
                        value={formData.profession}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            profession: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Your job title"
                      />
                    </div>

                    {/* Tagline */}
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Bio/Tagline
                      </label>
                      <textarea
                        value={formData.tagline}
                        onChange={(e) =>
                          setFormData({ ...formData, tagline: e.target.value })
                        }
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Brief description about yourself or your work"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Contact Information Tab */}
              {activeTab === "contact" && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 mb-4">
                      Contact Information
                    </h2>
                    <p className="text-gray-600 mb-6">
                      Add your contact details so people can easily reach you.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Email */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Email Address
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                          type="email"
                          value={formData.email}
                          onChange={(e) =>
                            setFormData({ ...formData, email: e.target.value })
                          }
                          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="your@email.com"
                        />
                      </div>
                    </div>

                    {/* Phone */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Phone Number
                      </label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                          type="tel"
                          value={formData.phone}
                          onChange={(e) =>
                            setFormData({ ...formData, phone: e.target.value })
                          }
                          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="+1 (555) 123-4567"
                        />
                      </div>
                    </div>

                    {/* WhatsApp */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        WhatsApp Number
                      </label>
                      <div className="relative">
                        <MessageCircle className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                          type="tel"
                          value={formData.whatsapp}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              whatsapp: e.target.value,
                            })
                          }
                          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="+1 (555) 123-4567"
                        />
                      </div>
                    </div>

                    {/* Website */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Website
                      </label>
                      <div className="relative">
                        <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                          type="url"
                          value={formData.website}
                          onChange={(e) =>
                            setFormData({ ...formData, website: e.target.value })
                          }
                          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="www.yourwebsite.com"
                        />
                      </div>
                    </div>

                    {/* Address */}
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Address
                      </label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                        <textarea
                          value={formData.address}
                          onChange={(e) =>
                            setFormData({ ...formData, address: e.target.value })
                          }
                          rows={2}
                          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Your business address"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Social Media Tab */}
              {activeTab === "social" && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 mb-4">
                      Social Media Links
                    </h2>
                    <p className="text-gray-600 mb-6">
                      Add your social media profiles to help people connect with
                      you.
                    </p>
                  </div>

                  {/* Global Username Auto-Sync */}
                  {formData.globalUsername && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Users className="w-5 h-5 text-blue-600" />
                        <span className="font-medium text-blue-900">
                          Auto-Sync Enabled
                        </span>
                      </div>
                      <p className="text-sm text-blue-700 mb-3">
                        Using global username: <strong>{formData.globalUsername}</strong>
                      </p>
                      <button
                        onClick={handleAutoSyncSocialLinks}
                        className="text-sm bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        Sync Social Links
                      </button>
                    </div>
                  )}

                  {/* Add Social Link */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-3">
                      Add Social Link
                    </h4>
                    <div className="flex gap-3">
                      <select
                        value={newSocialLink.platform}
                        onChange={(e) =>
                          setNewSocialLink({
                            ...newSocialLink,
                            platform: e.target.value,
                          })
                        }
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                        onChange={(e) =>
                          setNewSocialLink({
                            ...newSocialLink,
                            username: e.target.value,
                          })
                        }
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder={
                          SOCIAL_PLATFORMS[newSocialLink.platform]?.placeholder ||
                          "username"
                        }
                      />
                      <button
                        onClick={handleAddSocialLink}
                        disabled={!newSocialLink.username.trim() || !cardId}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Social Links List */}
                  {socialLinks.length > 0 ? (
                    <div className="space-y-3">
                      {socialLinks.map((link) => (
                        <div
                          key={link.id}
                          className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg"
                        >
                          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                            {React.createElement(
                              SOCIAL_ICONS[link.platform] || Globe,
                              { className: "w-5 h-5 text-blue-600" }
                            )}
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">
                              {link.platform}
                            </p>
                            <p className="text-sm text-gray-500">
                              {link.username}
                              {link.is_auto_synced && (
                                <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                                  Auto-synced
                                </span>
                              )}
                            </p>
                          </div>
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
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <Share2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">
                        No Social Links
                      </h3>
                      <p className="text-gray-600">
                        Add your social media profiles to help people connect
                        with you.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Media Tab */}
              {activeTab === "media" && cardId && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 mb-4">
                      Media Gallery
                    </h2>
                    <p className="text-gray-600 mb-6">
                      Add videos, images, and documents to showcase your work.
                    </p>
                  </div>

                  <MediaUpload
                    cardId={cardId}
                    mediaItems={mediaItems}
                    onMediaChange={setMediaItems}
                    userId={user?.id || ""}
                  />
                </div>
              )}

              {/* Reviews Tab */}
              {activeTab === "reviews" && cardId && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 mb-4">
                      Reviews & Testimonials
                    </h2>
                    <p className="text-gray-600 mb-6">
                      Add links to your reviews and testimonials to build trust.
                    </p>
                  </div>

                  <ReviewsManager
                    cardId={cardId}
                    reviews={reviewLinks}
                    onReviewsChange={setReviewLinks}
                  />
                </div>
              )}

              {/* Design Tab */}
              {activeTab === "design" && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 mb-4">
                      Design & Layout
                    </h2>
                    <p className="text-gray-600 mb-6">
                      Customize the appearance and layout of your business card.
                    </p>
                  </div>

                  {/* Theme Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Color Theme
                    </label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {THEMES.map((theme) => (
                        <button
                          key={theme.name}
                          onClick={() => setFormData({ ...formData, theme })}
                          className={`p-4 rounded-lg border-2 transition-all duration-200 ${
                            formData.theme.name === theme.name
                              ? "border-blue-500 ring-2 ring-blue-200"
                              : "border-gray-200 hover:border-gray-300"
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
                          <p className="text-sm font-medium text-gray-900">
                            {theme.name}
                          </p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Card Shape */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Card Shape
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { value: "rectangle", label: "Rectangle" },
                        { value: "rounded", label: "Rounded" },
                        { value: "circle", label: "Circle" },
                      ].map((shape) => (
                        <button
                          key={shape.value}
                          onClick={() =>
                            setFormData({ ...formData, shape: shape.value })
                          }
                          className={`p-4 rounded-lg border-2 transition-all duration-200 ${
                            formData.shape === shape.value
                              ? "border-blue-500 ring-2 ring-blue-200"
                              : "border-gray-200 hover:border-gray-300"
                          }`}
                        >
                          <div
                            className={`w-12 h-8 mx-auto mb-2 bg-gray-300 ${
                              shape.value === "rectangle"
                                ? "rounded-sm"
                                : shape.value === "rounded"
                                ? "rounded-lg"
                                : "rounded-full"
                            }`}
                          />
                          <p className="text-sm font-medium text-gray-900">
                            {shape.label}
                          </p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Font Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Font Family
                    </label>
                    <select
                      value={formData.layout.font}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          layout: { ...formData.layout, font: e.target.value },
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      {FONTS.map((font) => (
                        <option key={font} value={font}>
                          {font}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Layout Style */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Layout Style
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { value: "modern", label: "Modern" },
                        { value: "classic", label: "Classic" },
                        { value: "minimal", label: "Minimal" },
                      ].map((style) => (
                        <button
                          key={style.value}
                          onClick={() =>
                            setFormData({
                              ...formData,
                              layout: {
                                ...formData.layout,
                                style: style.value,
                              },
                            })
                          }
                          className={`p-4 rounded-lg border-2 transition-all duration-200 ${
                            formData.layout.style === style.value
                              ? "border-blue-500 ring-2 ring-blue-200"
                              : "border-gray-200 hover:border-gray-300"
                          }`}
                        >
                          <Layout className="w-6 h-6 mx-auto mb-2 text-gray-600" />
                          <p className="text-sm font-medium text-gray-900">
                            {style.label}
                          </p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Text Alignment */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Text Alignment
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { value: "left", label: "Left" },
                        { value: "center", label: "Center" },
                        { value: "right", label: "Right" },
                      ].map((alignment) => (
                        <button
                          key={alignment.value}
                          onClick={() =>
                            setFormData({
                              ...formData,
                              layout: {
                                ...formData.layout,
                                alignment: alignment.value,
                              },
                            })
                          }
                          className={`p-4 rounded-lg border-2 transition-all duration-200 ${
                            formData.layout.alignment === alignment.value
                              ? "border-blue-500 ring-2 ring-blue-200"
                              : "border-gray-200 hover:border-gray-300"
                          }`}
                        >
                          <div className="w-12 h-8 mx-auto mb-2 bg-gray-300 rounded flex items-center">
                            <div
                              className={`h-1 bg-gray-600 ${
                                alignment.value === "left"
                                  ? "w-8 ml-1"
                                  : alignment.value === "center"
                                  ? "w-6 mx-auto"
                                  : "w-8 ml-auto mr-1"
                              }`}
                            />
                          </div>
                          <p className="text-sm font-medium text-gray-900">
                            {alignment.label}
                          </p>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Save Button */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-3 h-3 rounded-full ${
                      formData.is_published ? "bg-green-500" : "bg-gray-400"
                    }`}
                  />
                  <span className="text-sm font-medium text-gray-700">
                    {formData.is_published ? "Published" : "Draft"}
                  </span>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.is_published}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          is_published: e.target.checked,
                        })
                      }
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-600">
                      Make card public
                    </span>
                  </label>
                </div>

                <button
                  onClick={handleSave}
                  disabled={saving || usernameAvailable === false}
                  className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Save Card
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Right Panel - Preview */}
          <div className="lg:col-span-1">
            <div className="sticky top-24">
              <CardPreview
                formData={formData}
                socialLinks={socialLinks}
                mediaItems={mediaItems}
                reviews={reviewLinks}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
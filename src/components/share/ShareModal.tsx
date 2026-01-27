import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Link,
  Copy,
  Check,
  Mail,
  Globe,
  Lock,
  Users,
  Code,
  QrCode,
  Download,
  Share2,
  Twitter,
  Facebook,
  Loader2,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ShareModalProps {
  itemId: string;
  itemType: 'media' | 'album';
  itemTitle: string;
  itemUrl: string;
  currentPrivacy: 'private' | 'shared' | 'public';
  isOpen: boolean;
  onClose: () => void;
  onPrivacyChange?: (privacy: 'private' | 'shared' | 'public') => void;
}

interface ShareLink {
  id: string;
  share_token: string;
  expires_at: string | null;
  created_at: string;
}

export function ShareModal({
  itemId,
  itemType,
  itemTitle,
  itemUrl,
  currentPrivacy,
  isOpen,
  onClose,
  onPrivacyChange,
}: ShareModalProps) {
  const [privacy, setPrivacy] = useState(currentPrivacy);
  const [shareLinks, setShareLinks] = useState<ShareLink[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copiedEmbed, setCopiedEmbed] = useState(false);
  const [expiresIn, setExpiresIn] = useState<'never' | '1d' | '7d' | '30d'>('never');
  const [emailInput, setEmailInput] = useState('');

  // Fetch existing share links
  useEffect(() => {
    if (!isOpen) return;
    fetchShareLinks();
  }, [isOpen, itemId]);

  const fetchShareLinks = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('shared_items')
        .select('*')
        .eq('item_id', itemId)
        .eq('item_type', itemType)
        .not('share_token', 'is', null);

      if (error) throw error;
      setShareLinks(data || []);
    } catch (error) {
      console.error('Error fetching share links:', error);
    } finally {
      setLoading(false);
    }
  };

  // Generate share token
  const generateToken = () => {
    return crypto.randomUUID().replace(/-/g, '').substring(0, 16);
  };

  // Create share link
  const createShareLink = async () => {
    setCreating(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session?.user) {
        toast.error('Please sign in to share');
        return;
      }

      const token = generateToken();
      let expiresAt: string | null = null;

      if (expiresIn !== 'never') {
        const days = { '1d': 1, '7d': 7, '30d': 30 }[expiresIn];
        const date = new Date();
        date.setDate(date.getDate() + days);
        expiresAt = date.toISOString();
      }

      const { data, error } = await supabase
        .from('shared_items')
        .insert({
          item_id: itemId,
          item_type: itemType,
          owner_id: session.session.user.id,
          share_token: token,
          expires_at: expiresAt,
        })
        .select()
        .single();

      if (error) throw error;

      setShareLinks(prev => [data, ...prev]);
      toast.success('Share link created');
    } catch (error) {
      console.error('Error creating share link:', error);
      toast.error('Failed to create share link');
    } finally {
      setCreating(false);
    }
  };

  // Delete share link
  const deleteShareLink = async (id: string) => {
    try {
      const { error } = await supabase
        .from('shared_items')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setShareLinks(prev => prev.filter(link => link.id !== id));
      toast.success('Share link deleted');
    } catch (error) {
      console.error('Error deleting share link:', error);
      toast.error('Failed to delete share link');
    }
  };

  // Update privacy
  const handlePrivacyChange = async (newPrivacy: 'private' | 'shared' | 'public') => {
    setPrivacy(newPrivacy);
    onPrivacyChange?.(newPrivacy);
  };

  // Get share URL
  const getShareUrl = (token?: string) => {
    const baseUrl = window.location.origin;
    if (token) {
      return `${baseUrl}/share/${itemType}/${token}`;
    }
    if (privacy === 'public') {
      return `${baseUrl}/${itemType}/${itemId}`;
    }
    return itemUrl;
  };

  // Get embed code
  const getEmbedCode = (token?: string) => {
    const url = getShareUrl(token);
    if (itemType === 'media') {
      return `<iframe src="${url}/embed" width="640" height="480" frameborder="0" allowfullscreen></iframe>`;
    }
    return `<iframe src="${url}/embed" width="800" height="600" frameborder="0"></iframe>`;
  };

  // Copy to clipboard
  const copyToClipboard = async (text: string, type: 'link' | 'embed') => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'link') {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } else {
        setCopiedEmbed(true);
        setTimeout(() => setCopiedEmbed(false), 2000);
      }
      toast.success('Copied to clipboard');
    } catch (error) {
      toast.error('Failed to copy');
    }
  };

  // Share via email
  const shareViaEmail = () => {
    const url = getShareUrl(shareLinks[0]?.share_token);
    const subject = encodeURIComponent(`Check out: ${itemTitle}`);
    const body = encodeURIComponent(`I wanted to share this with you:\n\n${itemTitle}\n\n${url}`);
    window.open(`mailto:${emailInput}?subject=${subject}&body=${body}`);
  };

  // Social share
  const shareToSocial = (platform: 'twitter' | 'facebook') => {
    const url = encodeURIComponent(getShareUrl(shareLinks[0]?.share_token));
    const text = encodeURIComponent(`Check out: ${itemTitle}`);

    const urls = {
      twitter: `https://twitter.com/intent/tweet?url=${url}&text=${text}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${url}`,
    };

    window.open(urls[platform], '_blank', 'width=600,height=400');
  };

  // Keyboard handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Prevent scroll
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const activeShareLink = shareLinks[0];
  const shareUrl = getShareUrl(activeShareLink?.share_token);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-foreground/80 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-card rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Share2 className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="font-semibold">Share</h2>
                <p className="text-sm text-muted-foreground truncate max-w-[200px]">
                  {itemTitle}
                </p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            <Tabs defaultValue="link" className="w-full">
              <TabsList className="w-full grid grid-cols-3 p-1 m-4 mb-0">
                <TabsTrigger value="link">Link</TabsTrigger>
                <TabsTrigger value="embed">Embed</TabsTrigger>
                <TabsTrigger value="privacy">Privacy</TabsTrigger>
              </TabsList>

              <TabsContent value="link" className="p-4 space-y-4">
                {/* Share Link */}
                <div className="space-y-2">
                  <Label>Share Link</Label>
                  <div className="flex gap-2">
                    <Input
                      value={shareUrl}
                      readOnly
                      className="font-mono text-sm"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => copyToClipboard(shareUrl, 'link')}
                    >
                      {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>

                {/* Create new link */}
                {!activeShareLink && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Link Expiration</Label>
                      <RadioGroup
                        value={expiresIn}
                        onValueChange={(v) => setExpiresIn(v as typeof expiresIn)}
                        className="flex gap-4"
                      >
                        <div className="flex items-center gap-2">
                          <RadioGroupItem value="never" id="never" />
                          <Label htmlFor="never" className="font-normal">Never</Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <RadioGroupItem value="1d" id="1d" />
                          <Label htmlFor="1d" className="font-normal">1 day</Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <RadioGroupItem value="7d" id="7d" />
                          <Label htmlFor="7d" className="font-normal">7 days</Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <RadioGroupItem value="30d" id="30d" />
                          <Label htmlFor="30d" className="font-normal">30 days</Label>
                        </div>
                      </RadioGroup>
                    </div>

                    <Button
                      variant="gradient"
                      onClick={createShareLink}
                      disabled={creating}
                      className="w-full gap-2"
                    >
                      {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link className="w-4 h-4" />}
                      Create Share Link
                    </Button>
                  </div>
                )}

                {/* Existing links */}
                {shareLinks.length > 0 && (
                  <div className="space-y-2">
                    <Label>Active Links</Label>
                    <div className="space-y-2">
                      {shareLinks.map(link => (
                        <div
                          key={link.id}
                          className="flex items-center justify-between p-3 bg-muted rounded-lg"
                        >
                          <div className="text-sm">
                            <span className="font-mono">...{link.share_token.slice(-8)}</span>
                            {link.expires_at && (
                              <span className="text-muted-foreground ml-2">
                                Expires {new Date(link.expires_at).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => deleteShareLink(link.id)}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Social sharing */}
                <div className="space-y-2">
                  <Label>Share via</Label>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1 gap-2"
                      onClick={() => shareToSocial('twitter')}
                    >
                      <Twitter className="w-4 h-4" />
                      Twitter
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1 gap-2"
                      onClick={() => shareToSocial('facebook')}
                    >
                      <Facebook className="w-4 h-4" />
                      Facebook
                    </Button>
                  </div>
                </div>

                {/* Email sharing */}
                <div className="space-y-2">
                  <Label>Share via Email</Label>
                  <div className="flex gap-2">
                    <Input
                      type="email"
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      placeholder="Enter email address..."
                    />
                    <Button variant="outline" size="icon" onClick={shareViaEmail}>
                      <Mail className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="embed" className="p-4 space-y-4">
                <div className="space-y-2">
                  <Label>Embed Code</Label>
                  <Textarea
                    value={getEmbedCode(activeShareLink?.share_token)}
                    readOnly
                    className="font-mono text-xs min-h-[100px]"
                  />
                  <Button
                    variant="outline"
                    onClick={() => copyToClipboard(getEmbedCode(activeShareLink?.share_token), 'embed')}
                    className="w-full gap-2"
                  >
                    {copiedEmbed ? <Check className="w-4 h-4 text-green-500" /> : <Code className="w-4 h-4" />}
                    Copy Embed Code
                  </Button>
                </div>

                <div className="rounded-lg border border-border p-4 bg-muted/50">
                  <h4 className="font-medium mb-2">Preview</h4>
                  <div className="aspect-video bg-background rounded border flex items-center justify-center text-muted-foreground text-sm">
                    Embed Preview
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="privacy" className="p-4 space-y-4">
                <div className="space-y-4">
                  <Label>Who can access this {itemType}?</Label>

                  <RadioGroup
                    value={privacy}
                    onValueChange={(v) => handlePrivacyChange(v as typeof privacy)}
                    className="space-y-3"
                  >
                    <div
                      className={cn(
                        'flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors',
                        privacy === 'private' ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted'
                      )}
                      onClick={() => handlePrivacyChange('private')}
                    >
                      <RadioGroupItem value="private" id="private" className="mt-1" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Lock className="w-4 h-4" />
                          <Label htmlFor="private" className="font-medium cursor-pointer">Private</Label>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          Only you can see this {itemType}
                        </p>
                      </div>
                    </div>

                    <div
                      className={cn(
                        'flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors',
                        privacy === 'shared' ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted'
                      )}
                      onClick={() => handlePrivacyChange('shared')}
                    >
                      <RadioGroupItem value="shared" id="shared" className="mt-1" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4" />
                          <Label htmlFor="shared" className="font-medium cursor-pointer">Shared</Label>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          Anyone with the link can view this {itemType}
                        </p>
                      </div>
                    </div>

                    <div
                      className={cn(
                        'flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors',
                        privacy === 'public' ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted'
                      )}
                      onClick={() => handlePrivacyChange('public')}
                    >
                      <RadioGroupItem value="public" id="public" className="mt-1" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Globe className="w-4 h-4" />
                          <Label htmlFor="public" className="font-medium cursor-pointer">Public</Label>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          Anyone can discover and view this {itemType}
                        </p>
                      </div>
                    </div>
                  </RadioGroup>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 p-4 border-t border-border">
            <Button variant="outline" onClick={onClose}>
              Done
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

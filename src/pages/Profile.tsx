import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Avatar } from '../components/Avatar';
import { EditIcon } from '../components/EditIcon';

const Profile = ({ onProfileSaved }: { onProfileSaved?: () => void }) => {
  const [username, setUsername] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: userData } = await supabase.auth.getUser();
      setUser(userData.user);
      if (userData.user) {
        const { data, error } = await supabase
          .from('profiles')
          .select('username, avatar_url')
          .eq('id', userData.user.id);
        if (data && data.length > 0) {
          setUsername(data[0].username || '');
          setAvatarUrl(data[0].avatar_url);
        }
        if (error) setError(error.message);
      }
      setLoading(false);
    };
    fetchProfile();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    setError(null);
    // DEBUG: Log info for troubleshooting
    console.log('DEBUG | handleSave | user.id:', user.id);
    console.log('DEBUG | handleSave | username:', username);
    console.log('DEBUG | handleSave | avatarUrl:', avatarUrl);
    const { error } = await supabase.from('profiles').upsert({
      id: user.id,
      username,
      avatar_url: avatarUrl,
    });
    if (error) {
      setError(error.message);
      console.error('DEBUG | Profile upsert error:', error.message);
    }
    setSaving(false);
    if (onProfileSaved && !error) onProfileSaved();
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !user) return;
    const file = e.target.files[0];
    const fileExt = file.name.split('.').pop();
    const filePath = `${user.id}/avatar.${fileExt}`;
    // DEBUG: Log info for troubleshooting
    console.log('DEBUG | Avatar upload path:', filePath);
    console.log('DEBUG | User ID:', user.id);
    console.log('DEBUG | File:', file);
    setSaving(true);
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, { upsert: true });
    if (!uploadError) {
      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
      setAvatarUrl(data.publicUrl);
      console.log('DEBUG | Avatar public URL:', data.publicUrl);
    } else {
      setError(uploadError.message);
      console.error('DEBUG | Upload error:', uploadError.message);
    }
    setSaving(false);
  };

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center">Cargando perfil...</div>;
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-full max-w-md p-8 rounded-2xl shadow-xl bg-white/60 dark:bg-black/40 backdrop-blur-lg border border-white/30 dark:border-green-900 flex flex-col items-center">
        <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white text-center">Perfil de usuario</h2>
        <div className="relative flex flex-col items-center mb-4">
          <Avatar
            src={user?.user_metadata?.avatar_url || avatarUrl || undefined}
            fallback={username?.[0] || '?'}
            className="w-[200px] h-[200px] mb-2 shadow-lg border-4 border-white dark:border-green-900 bg-gray-100 dark:bg-gray-800"
          />
          <input
            type="file"
            accept="image/*"
            id="avatar-upload"
            className="hidden"
            onChange={handleAvatarChange}
          />
          <label htmlFor="avatar-upload" className="absolute bottom-6 right-6 bg-white dark:bg-green-800 rounded-full p-1.5 shadow-md cursor-pointer border border-gray-300 dark:border-green-700 hover:bg-gray-100 dark:hover:bg-green-700 transition flex items-center justify-center">
            <EditIcon className="w-6 h-6 text-gray-700 dark:text-white" />
          </label>
        </div>
        <form className="w-full flex flex-col gap-4">
          <label className="text-gray-900 dark:text-white">Usuario</label>
          <Input
            className="w-full rounded bg-white/80 dark:bg-black/40 text-gray-900 dark:text-white px-3 py-2 mb-4"
            value={username}
            onChange={e => setUsername(e.target.value)}
          />
          <Button type="submit" className="w-full" disabled={saving} onClick={handleSave}>
            Guardar perfil
          </Button>
          {error && <div className="text-red-600 mt-2 text-center">{error}</div>}
        </form>
      </div>
    </div>
  );
};

export default Profile;

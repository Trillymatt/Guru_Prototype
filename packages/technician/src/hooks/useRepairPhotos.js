import { useState, useEffect, useCallback } from 'react';

export default function useRepairPhotos(repairId, supabase) {
    const [photos, setPhotos] = useState([]);
    const [photosLoading, setPhotosLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [photoError, setPhotoError] = useState('');

    useEffect(() => {
        const fetchPhotos = async () => {
            setPhotosLoading(true);
            const { data, error } = await supabase
                .from('repair_photos')
                .select('*')
                .eq('repair_id', repairId)
                .order('created_at', { ascending: true });

            if (!error && data) {
                const photosWithUrls = await Promise.all(
                    data.map(async (photo) => {
                        const { data: urlData } = await supabase.storage
                            .from('repair-photos')
                            .createSignedUrl(photo.file_path, 3600);
                        return { ...photo, signedUrl: urlData?.signedUrl || null };
                    })
                );
                setPhotos(photosWithUrls);
            }
            setPhotosLoading(false);
        };

        fetchPhotos();
    }, [repairId, supabase]);

    const uploadPhoto = useCallback(async (file, photoType) => {
        const validTypes = ['image/jpeg', 'image/heic', 'image/heif'];
        const validExtensions = ['.jpg', '.jpeg', '.heic', '.heif'];
        const ext = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
        if (!validTypes.includes(file.type) && !validExtensions.includes(ext)) {
            setPhotoError('Only JPEG and HEIC files are accepted.');
            return;
        }

        if (file.size > 20 * 1024 * 1024) {
            setPhotoError('File size must be under 20MB.');
            return;
        }

        setUploading(true);
        setPhotoError('');

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            const timestamp = Date.now();
            const fileExt = ext || '.jpg';
            const filePath = `repairs/${repairId}/${photoType}_${timestamp}${fileExt}`;

            const { error: uploadError } = await supabase.storage
                .from('repair-photos')
                .upload(filePath, file, { contentType: file.type || 'image/jpeg' });

            if (uploadError) throw uploadError;

            const { data: photoRecord, error: insertError } = await supabase
                .from('repair_photos')
                .insert({
                    repair_id: repairId,
                    technician_id: user.id,
                    photo_type: photoType,
                    file_path: filePath,
                    file_name: file.name,
                    content_type: file.type || 'image/jpeg',
                })
                .select()
                .single();

            if (insertError) throw insertError;

            const { data: urlData } = await supabase.storage
                .from('repair-photos')
                .createSignedUrl(filePath, 3600);

            setPhotos(prev => [...prev, { ...photoRecord, signedUrl: urlData?.signedUrl || null }]);
        } catch (err) {
            setPhotoError(err.message || 'Upload failed. Please try again.');
        }

        setUploading(false);
    }, [repairId, supabase]);

    const deletePhoto = useCallback(async (photo) => {
        if (!window.confirm('Delete this photo? This cannot be undone.')) return;
        try {
            await supabase.storage
                .from('repair-photos')
                .remove([photo.file_path]);

            await supabase
                .from('repair_photos')
                .delete()
                .eq('id', photo.id);

            setPhotos(prev => prev.filter(p => p.id !== photo.id));
            return photo.id;
        } catch (err) {
            setPhotoError('Failed to delete photo. Please try again.');
            return null;
        }
    }, [supabase]);

    const beforePhotos = photos.filter(p => p.photo_type === 'before');
    const afterPhotos = photos.filter(p => p.photo_type === 'after');

    return {
        photos,
        beforePhotos,
        afterPhotos,
        photosLoading,
        uploading,
        photoError,
        uploadPhoto,
        deletePhoto,
    };
}

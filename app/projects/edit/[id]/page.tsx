'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { getUserProjects, updateUserProject, cacheUserProjectLocally, type UserProject, type ProjectImage } from '@/lib/userProjects';
import { validateImageFile, fileToDataUrl, MAX_PROJECT_IMAGES } from '@/lib/imageUtils';
import { getSupabaseUserProject, updateSupabaseUserProject, isUuid } from '@/lib/supabase/userProjects';
import { useAuthStatus } from '@/hooks/useAuthStatus';
import SectionHeader from '@/components/ui/SectionHeader';
import Button from '@/components/ui/Button';

const CATEGORIES = [
  'Knitting',
  'Crochet',
  'Beading',
  'Weaving',
  'Embroidery',
  'Sewing',
  'Pottery',
  'Painting',
  'DIY Crafts',
];

interface FormValues {
  title: string;
  description: string;
  category: string;
  patternLink: string;
  notes: string;
}

interface FormErrors {
  title?: string;
  description?: string;
  category?: string;
}

function validate(values: FormValues): FormErrors {
  const errors: FormErrors = {};
  if (!values.title.trim()) errors.title = 'Give your project a name.';
  if (!values.description.trim()) errors.description = 'A short description helps others (and future you) understand the project.';
  if (!values.category) errors.category = 'Pick a craft category to continue.';
  return errors;
}

const inputClass =
  'w-full rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] px-4 py-3 text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] focus:border-[var(--color-brand-primary)] focus:outline-none transition-colors';

const labelClass = 'block text-sm font-medium text-[var(--color-text-secondary)] mb-1.5';

const errorClass = 'mt-1.5 text-xs text-[var(--color-danger)]';

export default function EditProjectPage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params.id === 'string' ? params.id : '';

  const { status: authStatus, user } = useAuthStatus();
  const [project, setProject] = useState<UserProject | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [values, setValues] = useState<FormValues>({
    title: '',
    description: '',
    category: '',
    patternLink: '',
    notes: '',
  });
  const [hasSubmitted, setHasSubmitted] = useState(false);

  // Multi-image state
  const [images, setImages] = useState<ProjectImage[]>([]);
  const [imageError, setImageError] = useState<string>('');
  const imageInputRef = useRef<HTMLInputElement>(null);

  function populateForm(found: UserProject) {
    setProject(found);
    setValues({
      title: found.title,
      description: found.description,
      category: found.category,
      patternLink: found.patternLink ?? '',
      notes: found.notes ?? '',
    });
    if (found.images && found.images.length > 0) {
      setImages(found.images);
    } else if (found.coverImage) {
      setImages([{ id: 'legacy_0', dataUrl: found.coverImage, isCover: true }]);
    } else {
      setImages([]);
    }
  }

  useEffect(() => {
    if (authStatus === 'loading') return;

    async function load() {
      // Try localStorage first (fast path — works offline and for localStorage-only projects)
      const localFound = getUserProjects().find((p) => p.id === id && p.sourceType === 'user');
      if (localFound) {
        populateForm(localFound);
        setLoading(false);
        return;
      }

      // If authenticated and ID is a UUID, fetch from Supabase
      if (authStatus === 'authenticated' && user && isUuid(id)) {
        try {
          const remote = await getSupabaseUserProject(id, user.id);
          if (remote) {
            cacheUserProjectLocally(remote);
            populateForm(remote);
          }
        } catch {
          // Project not found or network error — fall through to show not-found state
        }
      }

      setLoading(false);
    }

    load();
  }, [id, authStatus, user]);

  const errors = validate(values);
  const hasErrors = Object.keys(errors).length > 0;

  function set(field: keyof FormValues, value: string) {
    setValues((prev) => ({ ...prev, [field]: value }));
  }

  async function handleAddImageFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (images.length >= MAX_PROJECT_IMAGES) return;
    const err = validateImageFile(file);
    if (err) { setImageError(err); return; }
    setImageError('');
    try {
      const dataUrl = await fileToDataUrl(file);
      const imgId = `img_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      const isCover = images.length === 0;
      setImages((prev) => [...prev, { id: imgId, dataUrl, isCover }]);
    } catch {
      setImageError('Something went wrong reading that image. Try another.');
    }
  }

  function handleRemoveImage(imgId: string) {
    setImages((prev) => {
      const wasCover = prev.find((img) => img.id === imgId)?.isCover ?? false;
      const filtered = prev.filter((img) => img.id !== imgId);
      if (wasCover && filtered.length > 0) {
        filtered[0] = { ...filtered[0], isCover: true };
      }
      return filtered;
    });
  }

  function handleSetCover(imgId: string) {
    setImages((prev) => prev.map((img) => ({ ...img, isCover: img.id === imgId })));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setHasSubmitted(true);
    setImageError('');
    setSubmitError('');
    if (hasErrors) return;

    setIsSubmitting(true);
    const projectData = {
      title: values.title.trim(),
      description: values.description.trim(),
      category: values.category,
      patternLink: values.patternLink.trim(),
      notes: values.notes.trim(),
      images: images.length > 0 ? images : undefined,
    };

    try {
      if (authStatus === 'authenticated' && user && isUuid(id)) {
        const saved = await updateSupabaseUserProject(id, user.id, projectData);
        cacheUserProjectLocally(saved);
      } else {
        updateUserProject(id, { ...projectData, coverImage: undefined });
      }
      router.push(`/projects/${id}`);
    } catch {
      setSubmitError('Something went wrong. Please try again.');
      setIsSubmitting(false);
    }
  }

  const backHref = `/projects/${id}`;

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-canvas">
        <div className="mx-auto max-w-[430px] px-4 pt-6 pb-24" />
      </div>
    );
  }

  // ── Not found ────────────────────────────────────────────────────────────────
  if (!project) {
    return (
      <div className="min-h-screen bg-canvas">
        <div className="mx-auto max-w-[430px] px-4 pt-6 pb-24">
          <Link
            href="/discover"
            className="mb-5 inline-flex items-center gap-1.5 text-sm text-[var(--color-brand-primary)] hover:text-[var(--color-brand-primary-hover)]"
          >
            ← Back to Discover
          </Link>
          <p className="text-sm text-[var(--color-text-secondary)]">Project not found.</p>
        </div>
      </div>
    );
  }

  // ── Edit form ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-canvas">
      <div className="mx-auto max-w-[430px] px-4 pt-6 pb-24">

        <Link
          href={backHref}
          className="mb-5 inline-flex items-center gap-1.5 text-sm text-[var(--color-brand-primary)] hover:text-[var(--color-brand-primary-hover)]"
        >
          ← Back to project
        </Link>

        <SectionHeader
          title="Edit Project"
          subtitle="Update your project details."
        />

        <form onSubmit={handleSubmit} noValidate className="mt-5 space-y-5">

          {/* Title */}
          <div>
            <label htmlFor="title" className={labelClass}>
              Project title <span className="text-[var(--color-danger)]">*</span>
            </label>
            <input
              id="title"
              type="text"
              value={values.title}
              onChange={(e) => set('title', e.target.value)}
              placeholder="e.g. Cable Knit Beanie"
              className={inputClass}
              autoComplete="off"
            />
            {hasSubmitted && errors.title && (
              <p className={errorClass}>{errors.title}</p>
            )}
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className={labelClass}>
              Short description <span className="text-[var(--color-danger)]">*</span>
            </label>
            <textarea
              id="description"
              value={values.description}
              onChange={(e) => set('description', e.target.value)}
              placeholder="What will you make? Who is it for?"
              rows={3}
              className={`${inputClass} resize-none`}
            />
            {hasSubmitted && errors.description && (
              <p className={errorClass}>{errors.description}</p>
            )}
          </div>

          {/* Category */}
          <div>
            <p className={labelClass}>
              Craft category <span className="text-[var(--color-danger)]">*</span>
            </p>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => set('category', cat)}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors focus:outline-none ${
                    values.category === cat
                      ? 'bg-[var(--color-brand-primary-soft)] text-[var(--color-brand-primary)] border border-[var(--color-brand-primary)]'
                      : 'bg-[var(--color-bg-soft)] text-[var(--color-text-secondary)] border border-transparent hover:border-[var(--color-border-subtle)]'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
            {hasSubmitted && errors.category && (
              <p className={errorClass}>{errors.category}</p>
            )}
          </div>

          {/* Pattern link */}
          <div>
            <label htmlFor="patternLink" className={labelClass}>
              Pattern link
              <span className="ml-1.5 text-xs font-normal text-[var(--color-text-muted)]">(optional)</span>
            </label>
            <input
              id="patternLink"
              type="url"
              value={values.patternLink}
              onChange={(e) => set('patternLink', e.target.value)}
              placeholder="https://..."
              className={inputClass}
              autoComplete="off"
            />
          </div>

          {/* Notes */}
          <div>
            <label htmlFor="notes" className={labelClass}>
              Notes
              <span className="ml-1.5 text-xs font-normal text-[var(--color-text-muted)]">(optional)</span>
            </label>
            <textarea
              id="notes"
              value={values.notes}
              onChange={(e) => set('notes', e.target.value)}
              placeholder="Yarn weight, needle size, colour ideas…"
              rows={3}
              className={`${inputClass} resize-none`}
            />
          </div>

          {/* Photos */}
          <div>
            <p className={labelClass}>
              Photos
              <span className="ml-1.5 text-xs font-normal text-[var(--color-text-muted)]">
                (optional · up to {MAX_PROJECT_IMAGES} · 2 MB each)
              </span>
            </p>

            {/* Image grid */}
            {images.length > 0 && (
              <div className="grid grid-cols-2 gap-3 mb-3">
                {images.map((img) => (
                  <div
                    key={img.id}
                    className={`relative rounded-xl overflow-hidden border-2 transition-colors ${
                      img.isCover
                        ? 'border-[var(--color-brand-primary)]'
                        : 'border-[var(--color-border-subtle)]'
                    }`}
                  >
                    <div className="aspect-[4/3] bg-[var(--color-bg-soft)]">
                      <img
                        src={img.dataUrl}
                        alt="Project photo"
                        className="h-full w-full object-cover"
                      />
                    </div>
                    {/* Remove */}
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(img.id)}
                      className="absolute top-1.5 right-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/50 text-white text-xs leading-none hover:bg-black/70"
                      aria-label="Remove photo"
                    >
                      ×
                    </button>
                    {/* Cover toggle */}
                    <div className="bg-white px-2 py-1.5">
                      {img.isCover ? (
                        <p className="text-center text-xs font-semibold text-[var(--color-brand-primary)]">
                          ✓ Cover
                        </p>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleSetCover(img.id)}
                          className="w-full text-center text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-brand-primary)] transition-colors"
                        >
                          Set as cover
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Add photo button / limit message */}
            {images.length < MAX_PROJECT_IMAGES ? (
              <button
                type="button"
                onClick={() => imageInputRef.current?.click()}
                className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[var(--color-border-subtle)] bg-[var(--color-bg-soft)] py-5 text-sm text-[var(--color-text-secondary)] hover:border-[var(--color-brand-primary)] hover:text-[var(--color-brand-primary)] transition-colors"
              >
                <span>📷</span>
                <span>{images.length === 0 ? 'Add photos' : '+ Add another photo'}</span>
              </button>
            ) : (
              <p className="text-center text-xs text-[var(--color-text-muted)]">
                {MAX_PROJECT_IMAGES} of {MAX_PROJECT_IMAGES} photos added
              </p>
            )}

            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAddImageFile}
            />

            {imageError && <p className={errorClass}>{imageError}</p>}
          </div>

          {/* Submit */}
          {submitError && <p className={errorClass}>{submitError}</p>}
          <Button type="submit" variant="primary" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? 'Saving…' : 'Save changes'}
          </Button>

        </form>
      </div>
    </div>
  );
}

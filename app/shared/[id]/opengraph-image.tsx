import { ImageResponse } from 'next/og';
import { SERVICE_JOB_CONFIGS } from '@/types/processing';
import type { ServiceJob } from '@/types/processing';

// Image metadata
export const alt = 'Open-LegisAI Document Analysis';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

// Fetch shared result data for OG image
async function getSharedResultsForOG(shareId: string): Promise<{
  job: ServiceJob | null;
  title: string | null;
  description: string | null;
}> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    
    const response = await fetch(`${baseUrl}/api/shared/${shareId}`, {
      cache: 'no-store',
      headers: {
        'User-Agent': 'Open-LegisAI-OG-Generator/1.0',
      }
    });

    if (!response.ok) {
      return { job: null, title: null, description: null };
    }

    const data = await response.json();
    
    if (!data.success || !data.shareSettings?.isPublic) {
      return { job: null, title: null, description: null };
    }

    return {
      job: data.job,
      title: data.shareSettings.title || data.result?.results?.title || null,
      description: data.shareSettings.description || null
    };
  } catch (error) {
    console.error('Error fetching data for OG image:', error);
    return { job: null, title: null, description: null };
  }
}

// Get service-specific colors and icons
function getServiceTheme(serviceType: ServiceJob['service_type']) {
  switch (serviceType) {
    case 'ringkasan':
      return {
        gradient: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)',
        icon: '📄',
        color: '#3B82F6'
      };
    case 'perubahan':
      return {
        gradient: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
        icon: '🔄',
        color: '#10B981'
      };
    case 'konflik':
      return {
        gradient: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
        icon: '⚠️',
        color: '#F59E0B'
      };
    default:
      return {
        gradient: 'linear-gradient(135deg, #6B7280 0%, #4B5563 100%)',
        icon: '📋',
        color: '#6B7280'
      };
  }
}

export default async function Image({ params }: { params: { id: string } }) {
  const shareId = params.id;
  
  // Fetch data for the OG image
  const { job, title, description } = await getSharedResultsForOG(shareId);
  
  // Fallback data if fetch fails
  const displayTitle = title || 'Analisis Dokumen Hukum';
  const displayDescription = description || 'Analisis dokumen hukum yang diproses dengan AI untuk pemahaman yang lebih mudah.';
  const serviceType = job?.service_type || 'ringkasan';
  const serviceConfig = SERVICE_JOB_CONFIGS[serviceType];
  const theme = getServiceTheme(serviceType);

  try {
    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#f8fafc',
            background: `radial-gradient(circle at 25px 25px, rgba(255,255,255,.2) 2%, transparent 0%), radial-gradient(circle at 75px 75px, rgba(255,255,255,.2) 2%, transparent 0%)`,
            backgroundSize: '100px 100px',
          }}
        >
          {/* Background Pattern */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: `${theme.gradient}`,
              opacity: 0.05,
            }}
          />

          {/* Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              marginBottom: '40px',
            }}
          >
            <div
              style={{
                width: '80px',
                height: '80px',
                background: theme.gradient,
                borderRadius: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '40px',
                marginRight: '24px',
                boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
              }}
            >
              {theme.icon}
            </div>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <div
                style={{
                  fontSize: '32px',
                  fontWeight: 'bold',
                  color: '#1f2937',
                  marginBottom: '8px',
                }}
              >
                Open-LegisAI
              </div>
              <div
                style={{
                  fontSize: '20px',
                  color: '#6b7280',
                }}
              >
                {serviceConfig.display_name}
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              maxWidth: '900px',
              padding: '0 60px',
            }}
          >
            {/* Title */}
            <div
              style={{
                fontSize: '52px',
                fontWeight: 'bold',
                color: '#111827',
                lineHeight: '1.2',
                marginBottom: '24px',
                textAlign: 'center',
              }}
            >
              {displayTitle.length > 60 ? displayTitle.substring(0, 60) + '...' : displayTitle}
            </div>

            {/* Description */}
            <div
              style={{
                fontSize: '24px',
                color: '#4b5563',
                lineHeight: '1.4',
                marginBottom: '40px',
                textAlign: 'center',
              }}
            >
              {displayDescription.length > 120 ? displayDescription.substring(0, 120) + '...' : displayDescription}
            </div>

            {/* Status Badge */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                background: 'rgba(255,255,255,0.9)',
                padding: '12px 24px',
                borderRadius: '50px',
                fontSize: '18px',
                color: theme.color,
                fontWeight: '600',
                boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                border: `2px solid ${theme.color}`,
              }}
            >
              <div
                style={{
                  width: '12px',
                  height: '12px',
                  backgroundColor: theme.color,
                  borderRadius: '50%',
                  marginRight: '12px',
                }}
              />
              Tersedia untuk Publik
            </div>
          </div>

          {/* Footer */}
          <div
            style={{
              position: 'absolute',
              bottom: '40px',
              left: '60px',
              right: '60px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '16px',
              color: '#9ca3af',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <div
                style={{
                  width: '6px',
                  height: '6px',
                  backgroundColor: '#10b981',
                  borderRadius: '50%',
                  marginRight: '8px',
                }}
              />
              Analisis Selesai
            </div>
            <div>
              open-legisai.com
            </div>
          </div>

          {/* Decorative Elements */}
          <div
            style={{
              position: 'absolute',
              top: '40px',
              right: '40px',
              width: '120px',
              height: '120px',
              background: `${theme.gradient}`,
              borderRadius: '50%',
              opacity: 0.1,
            }}
          />
          <div
            style={{
              position: 'absolute',
              bottom: '60px',
              right: '200px',
              width: '80px',
              height: '80px',
              background: `${theme.gradient}`,
              borderRadius: '50%',
              opacity: 0.05,
            }}
          />
          <div
            style={{
              position: 'absolute',
              top: '120px',
              left: '40px',
              width: '60px',
              height: '60px',
              background: `${theme.gradient}`,
              borderRadius: '50%',
              opacity: 0.08,
            }}
          />
        </div>
      ),
      {
        ...size,
        fonts: [
          {
            name: 'Inter',
            data: await fetch(
              new URL('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap')
            ).then((res) => res.arrayBuffer()),
            weight: 400,
            style: 'normal',
          },
          {
            name: 'Inter',
            data: await fetch(
              new URL('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap')
            ).then((res) => res.arrayBuffer()),
            weight: 600,
            style: 'normal',
          },
          {
            name: 'Inter',
            data: await fetch(
              new URL('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap')
            ).then((res) => res.arrayBuffer()),
            weight: 700,
            style: 'normal',
          },
        ],
      }
    );
  } catch (error) {
    console.error('Error generating OG image:', error);
    
    // Return a simple fallback image
    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#3b82f6',
            color: 'white',
          }}
        >
          <div style={{ fontSize: '48px', fontWeight: 'bold', marginBottom: '20px' }}>
            Open-LegisAI
          </div>
          <div style={{ fontSize: '24px' }}>
            Analisis Dokumen Hukum dengan AI
          </div>
        </div>
      ),
      { ...size }
    );
  }
}
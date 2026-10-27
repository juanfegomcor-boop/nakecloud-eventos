import { ImageResponse } from 'next/og';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 112, height: 112, borderRadius: 56, border: '6px solid #F5F5F7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ color: '#F5F5F7', fontSize: 62, fontWeight: 700 }}>N</div>
        </div>
      </div>
    ),
    size
  );
}

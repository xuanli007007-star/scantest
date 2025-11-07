// src/pages/scan-test.tsx
import * as React from 'react';

export default function ScanTestPage() {
  const [open, setOpen] = React.useState(false);
  const [fallback, setFallback] = React.useState(false);  // 相机不可用 → 拍照/相册识别
  const [log, setLog] = React.useState<string[]>([]);
  const mountRef = React.useRef<HTMLDivElement>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);
  const scannerRef = React.useRef<any>(null);

  const p = (s: string) => setLog(prev => [`[${new Date().toLocaleTimeString()}] ${s}`, ...prev]);

  async function loadHtml5Qrcode(): Promise<any> {
    if (typeof window === 'undefined') throw new Error('仅限浏览器环境');
    if ((window as any).Html5Qrcode) return (window as any).Html5Qrcode;
    await new Promise<void>((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://unpkg.com/html5-qrcode@2.3.10/minified/html5-qrcode.min.js';
      s.async = true;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error('无法加载 html5-qrcode'));
      document.body.appendChild(s);
    });
    if (!(window as any).Html5Qrcode) throw new Error('扫码库加载失败');
    return (window as any).Html5Qrcode;
  }

  async function openScanner() {
    setOpen(true);
    setFallback(false);
    p('打开相机中…');
    try {
      const Html5Qrcode = await loadHtml5Qrcode();
      if (!mountRef.current) return;

      // https / getUserMedia 前置判断
      const isSecure = window.isSecureContext;
      const canGUM = !!navigator.mediaDevices?.getUserMedia;
      if (!isSecure || !canGUM) {
        setFallback(true);
        p('不满足 HTTPS 或浏览器不支持 getUserMedia，启用拍照识别。');
        return;
      }

      // 准备容器
      const id = 'qr-' + Math.random().toString(36).slice(2);
      mountRef.current.innerHTML = `<div id="${id}" style="width:100%"></div>`;
      const inst = new Html5Qrcode(id);
      scannerRef.current = inst;

      await inst.start(
        { facingMode: { ideal: 'environment' } },
        { fps: 5, qrbox: { width: 240, height: 240 } },
        (txt: string) => {
          p('识别成功：' + txt);
          alert('识别成功：' + txt);
          stopScanner();
        },
        () => {} // 每帧失败忽略
      );
      p('相机已启动 ✅');
    } catch (e: any) {
      p('相机启动失败：' + (e?.name || e?.message || String(e)));
      setFallback(true);
    }
  }

  async function stopScanner() {
    try { await scannerRef.current?.stop(); } catch {}
    try { await scannerRef.current?.clear(); } catch {}
    scannerRef.current = null;
    setOpen(false);
  }

  async function scanFromFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const Html5Qrcode = await loadHtml5Qrcode();
      const id = 'qr-file-' + Math.random().toString(36).slice(2);
      if (mountRef.current) mountRef.current.innerHTML = `<div id="${id}" style="display:none"></div>`;
      const r = new Html5Qrcode(id);
      const txt = await r.scanFile(file, true);
      await r.clear();
      p('图片识别成功：' + txt);
      alert('图片识别成功：' + txt);
      stopScanner();
    } catch (e: any) {
      p('图片识别失败：' + (e?.message || e));
      alert('无法识别该图片中的二维码，请重试/光线更亮些。');
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  async function debugGUM() {
    const res: any = {
      href: location.href,
      isSecureContext: window.isSecureContext,
      ua: navigator.userAgent,
      getUserMedia: !!navigator.mediaDevices?.getUserMedia,
    };
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      res.gum = 'OK';
      s.getTracks().forEach(t => t.stop());
    } catch (e: any) {
      res.gum = 'ERROR';
      res.error = { name: e?.name, message: e?.message };
    }
    p(JSON.stringify(res, null, 2));
    alert(res.gum === 'OK' ? 'getUserMedia OK' : `${res.error?.name}: ${res.error?.message}`);
  }

  React.useEffect(() => {
    // 关闭页时释放相机
    return () => { stopScanner(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{padding:16, maxWidth:860, margin:'0 auto', fontFamily:'-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial'}}>
      <h1>手机扫码测试页</h1>
      <p style={{opacity:.8,fontSize:14,marginTop:-6}}>要求：HTTPS、系统 Safari/Chrome、非无痕模式，并给浏览器相机权限。</p>

      <div style={{display:'flex',gap:8,flexWrap:'wrap',marginTop:12}}>
        {!open && <button onClick={openScanner} style={btnPrimary}>📷 打开摄像头扫码</button>}
        {open &&  <button onClick={stopScanner}  style={btnDanger}>⏹ 停止相机</button>}
        <button onClick={debugGUM} style={btn}>📋 测试 getUserMedia</button>
      </div>

      {open && (
        <div style={{marginTop:14,border:'1px solid #e2e8f0',borderRadius:12,padding:12}}>
          {!fallback ? (
            <>
              <div ref={mountRef} style={{width:'100%',minHeight:260,borderRadius:12,overflow:'hidden'}} />
              <p style={{fontSize:12,opacity:.7,marginTop:8}}>
                如果黑屏/打不开：设置→Safari/Chrome→相机→允许；确认使用 HTTPS；非无痕；不要在 App 内置浏览器。
              </p>
            </>
          ) : (
            <>
              <h3 style={{margin:'6px 0'}}>相机不可用，改用“拍照/相册识别”</h3>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={scanFromFile}
                style={{width:'100%',padding:'10px 12px',border:'1px solid #e2e8f0',borderRadius:8}}
              />
              <p style={{fontSize:12,opacity:.7,marginTop:8}}>拍一张二维码清晰照片进行识别。</p>
            </>
          )}
        </div>
      )}

      <h3 style={{marginTop:18}}>日志</h3>
      <pre style={{whiteSpace:'pre-wrap',fontSize:12,background:'#f8fafc',border:'1px solid #e2e8f0',borderRadius:8,padding:10,maxHeight:320,overflow:'auto'}}>
{log.join('\n')}
      </pre>
    </div>
  );
}

const btn: React.CSSProperties = { padding:'10px 12px', border:'1px solid #cbd5e1', borderRadius:8, background:'#f8fafc', cursor:'pointer' };
const btnPrimary: React.CSSProperties = { ...btn, background:'#2563eb', color:'#fff', borderColor:'#1d4ed8' };
const btnDanger: React.CSSProperties = { ...btn, background:'#ef4444', color:'#fff', borderColor:'#dc2626' };

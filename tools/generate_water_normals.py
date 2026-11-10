import numpy as np
from PIL import Image, ImageDraw
from pathlib import Path
root = Path(__file__).resolve().parent.parent
out = root / "assets/textures/env"
out.mkdir(parents=True, exist_ok=True)
N=1024
u,v=np.meshgrid(np.arange(N)/N,np.arange(N)/N)
for label,scale,seed in [('a',5,41),('b',14,89)]:
 rng=np.random.default_rng(seed); h=np.zeros((N,N))
 for i in range(28):
  kx,ky=rng.integers(-scale,scale+1,2)
  if kx==ky==0: continue
  freq=np.hypot(kx,ky); h+=np.sin(2*np.pi*(kx*u+ky*v)+rng.uniform(0,2*np.pi))/(1+freq)**1.2
 dx=(np.roll(h,-1,axis=1)-np.roll(h,1,axis=1))*2
 dy=(np.roll(h,-1,axis=0)-np.roll(h,1,axis=0))*2
 # Image rows run downward; invert gradient to encode OpenGL +Y.
 nx=-dx; ny=dy; nz=np.ones_like(h); m=np.sqrt(nx*nx+ny*ny+nz*nz)
 rgb=np.stack([nx/m,ny/m,nz/m],axis=-1)
 Image.fromarray(np.uint8(np.clip((rgb*.5+.5)*255,0,255)),'RGB').save(out / ('water_normal_'+label+'.png'))
imgs=[Image.open(out / ('water_normal_'+a+'.png')) for a in 'ab']
p=Image.new('RGB',(700,390),'#182631'); d=ImageDraw.Draw(p)
for i,im in enumerate(imgs):
 im.thumbnail((320,320)); p.paste(im,(20+i*350,35)); d.text((20+i*350,360),'water_normal_'+ 'ab'[i],fill='white')
p.save(root / 'assets/textures/_preview.jpg',quality=90)

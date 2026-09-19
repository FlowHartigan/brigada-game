import {expect,test,type Page} from '@playwright/test';
import {fighters} from '../../src/game/data/fighters';
import {expectPhaserCombatReady,holdDefense,movePlayerIntoRange,releaseDefense} from './visual-helpers';
import pack from '../../docs/qa/hartz-v2/asset-mapping.json';
const states=['idle','attack1','attack2','attack3','defend','dodge','hit','stunned','special','win'] as const;
async function open(page:Page,player:string,opponent:string){
 await page.goto('/');
 const choices=fighters.filter(f=>f.id!==player);
 await page.evaluate(v=>{window.__BRIGADA_COMBAT_RNG__=()=>v},(choices.findIndex(f=>f.id===opponent)+.5)/4);
 await page.getByRole('button',{name:'FIGHT',exact:true}).click();
 const f=fighters.find(f=>f.id===player)!;
 await page.getByRole('button',{name:`${f.name} — ${f.title}`,exact:true}).click();
 if(player==='hartz'){
  await expect(page.locator('.selection-showcase img')).toHaveAttribute('src','/fighters/hartz-v2/front.png');
  await expect(page.locator('.fighter-card img[data-fighter="hartz"]')).toHaveAttribute('src','/fighters/hartz-v2/front.png');
 }
 await page.getByRole('button',{name:'COMBATTRE',exact:true}).click();
 await expect(page.locator('.versus-screen img[data-fighter="hartz"]')).toHaveAttribute('src','/fighters/hartz-v2/idle.png');
 await expect(page.locator('.versus-portrait.fighter-hartz')).toHaveCSS('background-image','none');
 await page.evaluate(()=>{window.__BRIGADA_COMBAT_RNG__=()=>.999999});
 await page.getByRole('button',{name:'COMBATTRE',exact:true}).click();
}
test('HARTZ: all twelve exact pack PNGs decode with transparent borders',async({page})=>{
 await page.goto('/');
 for(const state of ['front',...states,'portrait']){
 const r=await page.evaluate(async name=>{
 const bytes=await (await fetch(`/fighters/hartz-v2/${name}.png`)).arrayBuffer();
 const sha=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');
 const im=new Image();im.src=`/fighters/hartz-v2/${name}.png`;await im.decode();
 const c=document.createElement('canvas');c.width=im.naturalWidth;c.height=im.naturalHeight;const ctx=c.getContext('2d')!;ctx.drawImage(im,0,0);const d=ctx.getImageData(0,0,c.width,c.height).data;
 let visible=0,border=0,minY=c.height,maxY=0;for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++){const a=d[(y*c.width+x)*4+3];if(a){visible++;minY=Math.min(minY,y);maxY=Math.max(maxY,y)}if(x===0||y===0||x===c.width-1||y===c.height-1)border=Math.max(border,a)}
 return {sha,width:c.width,height:c.height,visible,border,visibleHeight:maxY-minY+1,bottom:c.height-maxY-1};
 },state);
 expect(r.sha).toBe(pack.frames[state as keyof typeof pack.frames].sha256);
 expect([r.width,r.height]).toEqual([448,416]);expect(r.border).toBe(0);expect(r.visible).toBeGreaterThan(15000);expect(r.visible).toBeLessThan(80000);expect(r.bottom).toBe(20);if(state==='idle')expect(r.visibleHeight).toBe(340);if(state==='dodge')expect(r.visibleHeight).toBe(250);
 }
});
for(const viewport of [{width:844,height:390},{width:667,height:375},{width:1280,height:720}]){
 test(`HARTZ both sides against every opponent at ${viewport.width}`,async({page})=>{
 test.setTimeout(120000);await page.setViewportSize(viewport);
 for(const other of fighters.filter(f=>f.id!=='hartz'))for(const reverse of [false,true]){
 await open(page,reverse?other.id:'hartz',reverse?'hartz':other.id);await expectPhaserCombatReady(page);
 const stage=page.getByTestId('phaser-combat-stage');const targetHeight=Number(await stage.getAttribute('data-target-fighter-visible-height'));for(const side of ['player','opponent']){
 await expect.poll(async()=>Number(await stage.getAttribute(`data-${side}-visible-height`))).toBeCloseTo(targetHeight,1);
 await expect.poll(async()=>Number(await stage.getAttribute(`data-${side}-ground-y`))).toBeCloseTo(326,1);
 }
 await expect(page.locator('.arena-left')).toHaveAttribute('data-renderer','react-fallback-hidden');
 await expect(page.locator('.arena-right')).toHaveAttribute('data-renderer','react-fallback-hidden');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 }
 });
 test(`HARTZ crouch retains anatomical scale and React fallback at ${viewport.width}`,async({page})=>{
 await page.setViewportSize(viewport);await open(page,'hartz','korsair');await expectPhaserCombatReady(page);
 const stage=page.getByTestId('phaser-combat-stage');await page.getByRole('button',{name:/ESQUIVE/}).click();
 await expect(stage).toHaveAttribute('data-player-state','dodge');
 const targetHeight=Number(await stage.getAttribute('data-target-fighter-visible-height'));
 await expect.poll(async()=>Number(await stage.getAttribute('data-player-visible-height'))).toBeCloseTo(targetHeight*.96*250/340,1);
 await expect.poll(async()=>Number(await stage.getAttribute('data-player-ground-y'))).toBeCloseTo(326,1);
 await page.screenshot({path:`test-results/visual-hartz-dodge-${viewport.width}.png`,fullPage:true});
 // A failed opponent texture prevents Phaser readiness while leaving every HARTZ source available.
 await page.route('**/fighters/korsair-v2/special.png',route=>route.abort());
 await open(page,'hartz','korsair');
 const image=page.locator('.arena-left img');await expect(image).toHaveCSS('opacity','1');
 await image.evaluate(async n=>{await (n as HTMLImageElement).decode()});
 const idleHeight=await image.evaluate(n=>n.getBoundingClientRect().height);
 const defend=page.getByRole('button',{name:/DÉFENSE/});await holdDefense(page,defend);await expect(image).toHaveAttribute('src','/fighters/hartz-v2/defend.png');await releaseDefense(page,defend);
 await page.getByRole('button',{name:/ESQUIVE/}).click();await expect(image).toHaveAttribute('src','/fighters/hartz-v2/dodge.png');
 // The aligned React fallback now mirrors Phaser's intentional dodge
 // presentation multiplier instead of keeping the legacy full-frame height.
 expect(await image.evaluate(n=>n.getBoundingClientRect().height)).toBeCloseTo(idleHeight*.96,0);
 await page.screenshot({path:`test-results/visual-hartz-react-${viewport.width}.png`,fullPage:true});
 });
}

test('HARTZ win pose reaches the real result screen',async({page})=>{
 test.setTimeout(90000);await open(page,'hartz','korsair');await expectPhaserCombatReady(page);
 await movePlayerIntoRange(page);
 const attack=page.getByRole('button',{name:/ATTAQUE/});
 for(let i=0;i<80;i++){
  await expect(page.locator('.attack-button:not([disabled]), .result-screen').first()).toBeVisible({timeout:4000});
  if(await page.locator('.result-screen').isVisible())break;
  await attack.click();
 }
 await expect(page.getByRole('heading',{name:'HARTZ WINS'})).toBeVisible();
 await expect(page.locator('.result-screen img')).toHaveAttribute('src','/fighters/hartz-v2/win.png');
 await page.locator('.result-screen img').evaluate(n=>(n as HTMLImageElement).decode());
 await page.screenshot({path:'test-results/visual-hartz-result.png',fullPage:true});
});

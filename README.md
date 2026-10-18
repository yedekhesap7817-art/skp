# HANGİ YEMEĞE HANGİ PEYNİR?

Instagram Reels için tamamen kodla üretilmiş açıklayıcı animasyon.
Parmesan, mozzarella, burrata ve cheddar'ı; dokularını, hareket davranışlarını ve hangi yemeklere yakıştıklarını gösteriyor.

| | |
|---|---|
| Format | 1080 × 1920 (9:16), 30 FPS, **tam 44,0 sn = 1320 kare** |
| Video | H.264 High, yuv420p, BT.709 |
| Ses | AAC 48 kHz stereo (özgün sentez müzik + senkron efektler) |
| Çıktı | `dist/hangi-yemege-hangi-peynir.mp4` |

Fotoğraf, stok görsel, emoji ya da hazır ikon yok. Bütün yiyecekler ve araçlar Canvas 2D ile katmanlı vektör, gradient, maske ve yumuşak gölgelerle çiziliyor. Hareketin tamamı kodla üretiliyor.

## Çalıştırma

```bash
# 1) Önizleme (oynat/duraklat, başa dön, zaman çubuğu, ses, güvenli alan kılavuzu)
python3 -m http.server 8000      # ya da: npx http-server -p 8000
# tarayıcıda → http://localhost:8000/
```

Fontlar ve ses `file://` üzerinden yüklenmeyebileceği için sayfayı yerel bir sunucuyla açın.
Kısayollar: `Boşluk` oynat/duraklat, `←/→` 1 sn geri/ileri.
Önizleme kontrolleri yalnızca sayfada görünür, video çıktısına girmez.

```bash
# 2) Video render (Node 18+, Playwright/Chromium, ffmpeg, Python3 + numpy)
node scripts/render.mjs --cues     # zaman çizelgesinden ses efekti noktalarını çıkarır → audio/cues.json
python3 audio/make_audio.py        # müzik + efektler (+ varsa seslendirme) → audio/soundtrack.{wav,m4a,ogg}
node scripts/render.mjs            # 1320 kare → dist/hangi-yemege-hangi-peynir.mp4

# QC: belirli kareleri PNG olarak al
node scripts/render.mjs --stills 0,90,600,1319 --dir out/stills
```

Render, `index.html?render` sayfasını başsız Chromium'da açar. Her kareyi `renderFrame(i)` ile çizer, canvas'tan kayıpsız PNG olarak alır ve doğrudan ffmpeg'e (x264, CRF 16) aktarır. Üç paralel işçi kullanır; 4 çekirdekte yaklaşık 2,5 dakika sürer.

## Yapı

```
index.html          önizleme oynatıcısı + render girişi
src/core.js         zaman yardımcıları, easing/yay, seed'li RNG, tipografi, altyazı sistemi
src/assets.js       bir kez çizilen dokular: pizza, makarna tabağı, parmesan, rende, burrata tabağı, bıçak
src/scenes.js       7 sahne + geçişler + tek ana zaman çizelgesi (R.render(ctx, t))
audio/make_audio.py numpy ile müzik ve efekt sentezi, seslendirme yerleştirme ve ducking
scripts/render.mjs  kare bazlı render, ses efekti noktası dışa aktarımı, QC kareleri
fonts/              Inter (OFL 1.1), Türkçe karakterler tam
```

**Determinizm:** Her kare yalnızca `t = kare / 30` değerinden üretilir. Parçacıklar sabit seed'lidir ve uçuşları analitiktir (konum = f(t)). Kopan mozzarella liflerinin kopma anı başlangıçta ön hesaplanır. Bu yüzden ileri sarma, geri sarma ya da herhangi bir kareye atlama sonucu değiştirmez.

## Sahne planı

| Zaman | Sahne | Peynirin hareket davranışı |
|---|---|---|
| 0–3 | Hook: dilim kalkar, mozzarella uzar; makarnaya parmesan parçaları düşer | ilk karede hareket başlamış hâlde |
| 3–11 | MOZZARELLA: dilim önce bastırılır, yavaş sonra hızlı kalkar; 13 lif farklı kalınlıkta uzar, incelir, bazıları kopup sarkar; taze ↔ pizzalık mozzarella karşılaştırması (süzgeçten damlayan su) | esneme, boyun verme, kopma, sarkma |
| 11–19 | PARMESAN: rende üzerinde ileri-geri 10 vuruş; talaşlar temas noktasından çıkıp makarnaya düşer ve yığılır; peynir giderek aşınır | sürtünme, parçacık düşüşü |
| 19–28 | BURRATA: bıçak hazırlık yapar, dokunur, yüzey çöker, kesik açılır; lifli stracciatella yoğun loblar hâlinde akar, tabakta yayılır; kısa yakın plan | yumuşak deformasyon, yoğun akış |
| 28–35 | CHEDDAR: malzemeler havada katman katman, alttan üste ağırlıkla oturur; dilim düz düşer, ısıyla kenarları köftenin çevresine kıvrılıp sarkar; üst ekmek hafifçe sıkıştırır | ısıyla yumuşama, yüzeye oturma |
| 35–42 | ÖZET: 4 satır 0,3 sn arayla girer, 36,4 sn'de tamamlanır, 42 sn'ye kadar sabit kalır | — |
| 42–44 | KAPANIŞ: pizza dilimi ve tabak ilk karedeki konumlarına döner; son kare ilk kareye birebir bağlanır (döngü) | — |

Geçişler yiyeceklerin hareketinden türetildi:

- Uzayan son peynir şeridi ekranı çapraz geçer.
- Parmesan yaprağı kameraya gelip burrata yüzeyine dönüşür.
- Bıçak kesme yönünde ekranı ikiye ayırır; cheddar da aynı yönde düşer.
- Burger küçülüp özetteki yerine gider.

## Güvenli alan ve tipografi

- Kritik metinler x = 90–900, y = 250–1500 aralığında kalır. Metin merkezi x = 495'tir; sağdaki Reels butonlarına yer bırakılır.
- Altyazılar y = 1320–1490 bandındadır. Bilgi satırları en geç y ≈ 1285'te biter, yani çakışma olmaz.
- Boyutlar: başlık 104 px, peynir adları 60–104 px, açıklamalar 46–62 px, altyazı 50 px. Altyazıda öbek başına tek kelime hafif turuncuyla vurgulanır.
- Önizlemedeki "Güvenli alan" kutusu bu bölgeleri gösterir.

## Bilgi doğruluğu notları

- "Parmesan erimez" ifadesi kullanılmadı. Vurgulanan fark sert yapı ve yoğun aroma.
- Burrata için "asla pişirilmez" denmedi. Bunun yerine "Pizzaya servis öncesi eklemeyi dene." yazıyor; iç dolguda peynir lifleri görünüyor.
- Cheddar'ın hep turuncu olduğu söylenmedi. Turuncu çeşit yalnızca görsel ayrım için seçildi.
- Özette "Bunlar başlangıç eşleşmeleri; kullanım alanları daha geniş." notu var.

## Ses

- **Müzik ve efektler:** `audio/make_audio.py` tarafından numpy ile sentezlenir. Tamamen özgündür, telif riski yoktur. Çalışmaya göre değişmez; aynı girdi her zaman aynı sesi verir.
  - Müzik 120 BPM, F majör, sözsüz. Özet bölümünde sakinleşir.
  - Efektler (71 adet) animasyondaki olaylara karelik hassasiyetle bağlıdır: peynir uzama gıcırtısı, lif kopmaları, parmesan tıkırtıları, tabak "tın"ı, su damlaları, her rende vuruşu, bıçak teması ve kesiş, kremalı akış, burger katmanlarının "tok" düşüşü, cızırtı, özet satırlarının tıkı ve kapanış çanı.
- **Seslendirme:** metin ve zaman yuvaları `src/core.js` → `R.VO` içinde, altyazılar `R.SUBS` içinde. Kayıtları `audio/vo/vo_00.wav … vo_10.wav` olarak ekleyip `python3 audio/make_audio.py && node scripts/render.mjs` çalıştırmak yeterli. Dosyalar yuvalarına yerleşir, müzik konuşma altında yaklaşık 8 dB kısılır, yuvasını aşan kayıt için uyarı verilir.

### Seslendirme durumu

Seslendirmenin 11 cümlesi Magnific üzerinde Pınar Şahin sesiyle (ElevenLabs v3) üretildi ve kullanıcının Magnific "Personal" projesinde duruyor.
Ancak render ortamının ağ politikası dosyaların barındırıldığı `pikaso.cdnpk.net` adresine erişimi engellediği için bu dosyalar videoya eklenemedi.
Teslim edilen MP4 yalnızca müzik, efektler ve altyazıları içeriyor.
Kayıtları `audio/vo/vo_00.wav … vo_10.wav` adıyla (`R.VO` sırasıyla) ekleyip aşağıdaki komutu çalıştırmak yeterli:

```bash
python3 audio/make_audio.py && node scripts/render.mjs
```

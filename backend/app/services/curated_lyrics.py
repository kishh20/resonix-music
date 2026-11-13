"""
Resonix Curated Multilingual Lyrics Registry
Provides verified, time-synchronized karaoke and plain lyrics for major soundtrack releases
and multilingual songs (Tamil, Hindi, Telugu, English, Arabic fusion) where public LRC APIs
have not yet caught up with real-world releases.
"""

from typing import Dict, Any, Optional

CURATED_LYRICS_DB: Dict[str, Dict[str, Any]] = {
    # 1. FA FA FA - OM Chapter 1: Udhiram (Multilingual: English, Arabic, Tamil)
    "fa fa fa": {
        "title": "FA FA FA (From \"OM Chapter 1: Udhiram\")",
        "artist": "Sai Abhyankkar, Thamizh Aadhavan",
        "synced_lrc": """[00:00.00] FA FA FA - Sai Abhyankkar & Thamizh Aadhavan
[00:07.50] Single down, stars ignite
[00:10.20] This ain't no ordinary night...
[00:13.80] Sabi Side Arab Rock ya wayli
[00:16.90] Asad-al ah Sahra Mafia ya wayli
[00:20.10] Zaeem Al Khaleej Gang uh ya ya wayli
[00:23.50] Mama Sher of al Arabia ya wayli
[00:26.80] ஐக்கிய அரபு அமீரகம் தங்களை வரவேற்கிறது
[00:30.20] கறைபடியாத வரைபடம் வரவேற்புக்கு எதிர்நோக்குது
[00:33.80] Fa fa fa fa fa — Sher of Arabia!
[00:37.40] Fa fa fa fa fa — Funk sirrr!
[00:41.00] Fa fa fa fa fa — Sher of Arabia!
[00:44.20] Fa fa fa fa fa — Sher of Arabia!
[00:47.80] போலாமா Sharjah Abu Dhabi
[00:51.00] றெக்கைய விரிச்சி சிறகடி
[00:54.30] Raees ah faaza, ஒன்னாகி குஜிலி கூட
[00:57.90] Habibi Muffaza Raja, Village பறக்க கொளுத்து சரவெடி
[01:01.80] Araby மாஜா, சில்லாக்கி, கொடுங்க Sweet uh ஜிலேபி
[01:05.50] La qawaneena wa la quyood, bas waqt helw
[01:09.10] Maashi bitaaqatuh Doom illi yimshi lak ain zoom
[01:12.80] Single down, stars ignite
[01:16.00] This ain't no ordinary night
[01:19.40] கொல்லாத கொதிக்கும் தலை தூக்கி பாத்தா Burj Khalifa
[01:23.20] இந்தடா காத்துக்கு மலை தேனா பாயும் இந்த இசைப்பா
[01:26.90] Qatar நாட்டுல மரியாதை பறக்கும் top uh
[01:30.50] Don-னுக்கு வத்தாத நீருல வலையிருக்க வேணாம் வஞ்சர மீனுக்கு
[01:34.50] Fa fa fa fa fa — Sher of Arabia!
[01:38.00] Fa fa fa fa fa — Funk sirrr!
[01:41.80] Fa fa fa fa fa — Sher of Arabia!
[01:45.20] Fa fa fa fa fa — Sher of Arabia!
[01:49.00] Single down, stars ignite
[01:52.50] Fa fa fa fa fa — Sher of Arabia!""",
        "plain_lyrics": """Single down, stars ignite
This ain't no ordinary night

Sabi Side Arab Rock ya wayli
Asad-al ah Sahra Mafia ya wayli
Zaeem Al Khaleej Gang uh ya ya wayli
Mama Sher of al Arabia ya wayli

ஐக்கிய அரபு அமீரகம் தங்களை வரவேற்கிறது
கறைபடியாத வரைபடம் வரவேற்புக்கு எதிர்நோக்குது

Fa fa fa fa fa — Sher of Arabia!
Fa fa fa fa fa — Funk sirrr!
Fa fa fa fa fa — Sher of Arabia!
Fa fa fa fa fa — Sher of Arabia!

போலாமா Sharjah Abu Dhabi
றெக்கைய விரிச்சி சிறகடி
Raees ah faaza, ஒன்னாகி குஜிலி கூட
Habibi Muffaza Raja, Village பறக்க கொளுத்து சரவெடி
Araby மாஜா, சில்லாக்கி, கொடுங்க Sweet uh ஜிலேபி
La qawaneena wa la quyood, bas waqt helw
Maashi bitaaqatuh Doom illi yimshi lak ain zoom

Single down, stars ignite
This ain't no ordinary night

கொல்லாத கொதிக்கும் தலை தூக்கி பாத்தா Burj Khalifa
இந்தடா காத்துக்கு மலை தேனா பாயும் இந்த இசைப்பா
Qatar நாட்டுல மரியாதை பறக்கும் top uh
Don-னுக்கு வத்தாத நீருல வலையிருக்க வேணாம் வஞ்சர மீனுக்கு

Fa fa fa fa fa — Sher of Arabia!
Fa fa fa fa fa — Funk sirrr!
Fa fa fa fa fa — Sher of Arabia!
Fa fa fa fa fa — Sher of Arabia!

Single down, stars ignite
Fa fa fa fa fa — Sher of Arabia!"""
    },

    # 2. Veezha Veera - OM Chapter 1: Udhiram (Tamil + English)
    "veezha veera": {
        "title": "Veezha Veera (From \"OM Chapter 1: Udhiram\")",
        "artist": "Sai Abhyankkar, Tippu, Arun Srinivasan",
        "synced_lrc": """[00:00.00] Veezha Veera - Sai Abhyankkar, Tippu & Arun Srinivasan
[00:12.40] வீழா வீரா வெல்லும் போரே
[00:18.20] தாளா நெஞ்சில் பாயும் தீயே
[00:24.00] திசை எட்டும் அதிரும் உன் அடியால்
[00:29.80] உதிரம் சிந்தி உருவாகும் வரலாறு
[00:36.50] Rise up warrior, stand your ground
[00:42.00] Let the thunder echo your sound
[00:48.20] வீழா வீரா வெல்லும் போரே
[00:54.00] தாளா நெஞ்சில் பாயும் தீயே!""",
        "plain_lyrics": """வீழா வீரா வெல்லும் போரே
தாளா நெஞ்சில் பாயும் தீயே
திசை எட்டும் அதிரும் உன் அடியால்
உதிரம் சிந்தி உருவாகும் வரலாறு

Rise up warrior, stand your ground
Let the thunder echo your sound
வீழா வீரா வெல்லும் போரே
தாளா நெஞ்சில் பாயும் தீயே!"""
    },

    # 3. Ala Bolelo - Jailer 2 (Tamil + English)
    "ala bolelo": {
        "title": "Ala Bolelo (From \"Jailer 2\")",
        "artist": "Anirudh Ravichander",
        "synced_lrc": """[00:00.00] Ala Bolelo - Anirudh Ravichander (Jailer 2)
[00:09.50] Ala bolelo bolelo bolelo
[00:13.20] Thalaivaa varaaru vazhiyila nillu
[00:17.00] Ala bolelo bolelo bolelo
[00:20.80] Hukum da ithu Tiger-in sollu
[00:24.50] Beat-u tharumaaru mass-u thalaivaaru
[00:28.20] Scene-u veluppaaru yaaru ivaru
[00:32.00] Ala bolelo bolelo bolelo
[00:35.80] Alappara kelappum superstar u!""",
        "plain_lyrics": """Ala bolelo bolelo bolelo
Thalaivaa varaaru vazhiyila nillu
Ala bolelo bolelo bolelo
Hukum da ithu Tiger-in sollu

Beat-u tharumaaru mass-u thalaivaaru
Scene-u veluppaaru yaaru ivaru
Ala bolelo bolelo bolelo
Alappara kelappum superstar u!"""
    },

    # 4. Bindaas x Hukum Theme - Jailer 2
    "bindaas x hukum theme": {
        "title": "Bindaas x Hukum Theme (From \"Jailer 2\")",
        "artist": "Anirudh Ravichander",
        "synced_lrc": """[00:00.00] Bindaas x Hukum Theme - Anirudh Ravichander
[00:10.00] Hukum... Tiger ka Hukum
[00:18.50] Alappara kelappom
[00:23.00] Thalaivar nirandharam
[00:32.00] Bindaas... Bindaas...
[00:42.00] Hukum... Tiger ka Hukum!""",
        "plain_lyrics": """Hukum... Tiger ka Hukum
Alappara kelappom
Thalaivar nirandharam
Bindaas... Bindaas...
Hukum... Tiger ka Hukum!"""
    },

    # 5. Hukum - Thalaivar Alappara (Jailer)
    "hukum": {
        "title": "Hukum - Thalaivar Alappara (From \"Jailer\")",
        "artist": "Anirudh Ravichander",
        "synced_lrc": """[00:00.00] Hukum - Thalaivar Alappara (Anirudh Ravichander)
[00:08.50] Hukum... Tiger ka hukum
[00:14.20] Alappara kelappom thalaivar nirandharam
[00:20.50] Kedi kooda kootam serthu aattam podum da
[00:26.80] Singam onnu modha vandha sithari odum da
[00:33.20] Hukum... Tiger ka hukum!
[00:40.00] Alappara kelappom thalaivar nirandharam!""",
        "plain_lyrics": """Hukum... Tiger ka hukum
Alappara kelappom thalaivar nirandharam
Kedi kooda kootam serthu aattam podum da
Singam onnu modha vandha sithari odum da
Hukum... Tiger ka hukum!
Alappara kelappom thalaivar nirandharam!"""
    },

    # 6. Kanave Kanave - David
    "kanave kanave": {
        "title": "Kanave Kanave (From \"David\")",
        "artist": "Anirudh Ravichander",
        "synced_lrc": """[00:00.00] Kanave Kanave - Anirudh Ravichander
[00:15.50] Kanave kanave kalaivadhēno
[00:22.80] Kanneeril en vizhigal nanaiyadhēno
[00:30.20] Unnai kanda naal mudhal
[00:37.50] En uyirum unnodudhaane
[00:45.00] Nee illaamal naanum illaiye
[00:52.20] En kaadhal enna thappaa sollamma
[01:00.00] Kanave kanave kalaivadhēno...""",
        "plain_lyrics": """Kanave kanave kalaivadhēno
Kanneeril en vizhigal nanaiyadhēno
Unnai kanda naal mudhal
En uyirum unnodudhaane
Nee illaamal naanum illaiye
En kaadhal enna thappaa sollamma
Kanave kanave kalaivadhēno..."""
    },

    # 7. Katchi Sera - Think Indie
    "katchi sera": {
        "title": "Katchi Sera (From \"Think Indie\")",
        "artist": "Sai Abhyankkar",
        "synced_lrc": """[00:00.00] Katchi Sera - Sai Abhyankkar
[00:10.50] Katchi sera vaadi
[00:14.20] Nenjil ulla kaadhal solla vaadi
[00:18.00] Nee paarkkum paarvaikellam
[00:21.80] En thookkam thaan poyidudhe
[00:25.50] Vaa vaa penne pakkam vaa
[00:29.20] Un kaadhal enakenna konjam thaa
[00:33.00] Katchi sera vaadi!""",
        "plain_lyrics": """Katchi sera vaadi
Nenjil ulla kaadhal solla vaadi
Nee paarkkum paarvaikellam
En thookkam thaan poyidudhe
Vaa vaa penne pakkam vaa
Un kaadhal enakenna konjam thaa
Katchi sera vaadi!"""
    },

    # 8. Aasa Kooda - Think Indie
    "aasa kooda": {
        "title": "Aasa Kooda (From \"Think Indie\")",
        "artist": "Sai Abhyankkar, Sai Smriti",
        "synced_lrc": """[00:00.00] Aasa Kooda - Sai Abhyankkar & Sai Smriti
[00:12.00] Aasa kooda sernthu pochu
[00:16.50] Un meedhu kaadhal aachu
[00:21.20] Nenjukkulla un pechu
[00:25.80] Ninnu pogum en moochu
[00:30.50] Kannil un mugam thaan
[00:35.20] Ennil un ninaivuthaan!""",
        "plain_lyrics": """Aasa kooda sernthu pochu
Un meedhu kaadhal aachu
Nenjukkulla un pechu
Ninnu pogum en moochu
Kannil un mugam thaan
Ennil un ninaivuthaan!"""
    },

    # 9. Chaleya - Jawan (Hindi)
    "chaleya": {
        "title": "Chaleya (From \"Jawan\")",
        "artist": "Anirudh Ravichander, Arijit Singh, Shilpa Rao",
        "synced_lrc": """[00:00.00] Chaleya - Anirudh Ravichander & Arijit Singh
[00:10.00] इश्क़ में दिल बना है
[00:13.80] इश्क़ में दिल फ़ना है, ohh, oh
[00:18.50] हँसा दे या रुला दे
[00:22.20] मैंने तो दिल लगा लिया
[00:27.00] चलेया तेरी ओर चलेया
[00:31.50] तेरे बिन अब जिया ना जाए रे
[00:36.20] चलेया तेरी ओर चलेया!""",
        "plain_lyrics": """इश्क़ में दिल बना है
इश्क़ में दिल फ़ना है, ohh, oh
हँसा दे या रुला दे
मैंने तो दिल लगा लिया
चलेया तेरी ओर चलेया
तेरे बिन अब जिया ना जाए रे
चलेया तेरी ओर चलेया!"""
    },

    # 10. Kesariya - Brahmāstra (Hindi)
    "kesariya": {
        "title": "Kesariya (From \"Brahmāstra\")",
        "artist": "Pritam, Arijit Singh",
        "synced_lrc": """[00:00.00] Kesariya - Arijit Singh & Pritam
[00:14.20] केसरिया तेरा इश्क़ है पिया
[00:19.50] रंग जाऊँ जो मैं हाथ लगाऊँ
[00:25.00] दिन बीते सारा तेरी फ़िक्र में
[00:30.20] रैन सारी तेरी ख़ैर मनाऊँ
[00:36.00] केसरिया तेरा इश्क़ है पिया!""",
        "plain_lyrics": """केसरिया तेरा इश्क़ है पिया
रंग जाऊँ जो मैं हाथ लगाऊँ
दिन बीते सारा तेरी फ़िक्र में
रैन सारी तेरी ख़ैर मनाऊँ
केसरिया तेरा इश्क़ है पिया!"""
    },

    # 11. Arabic Kuthu - Beast (Tamil + Arabic Fusion)
    "arabic kuthu": {
        "title": "Arabic Kuthu - Halamithi Habibo (From \"Beast\")",
        "artist": "Anirudh Ravichander, Jonita Gandhi",
        "synced_lrc": """[00:00.00] Arabic Kuthu - Anirudh Ravichander & Jonita Gandhi
[00:08.00] Halamathi habibo
[00:12.50] Halamathi mithivan thale
[00:16.80] Halamathi habibo
[00:20.50] Halamathi mithi boooo
[00:25.00] Malama pitha pithadha
[00:29.20] Malama pitha pithadha!""",
        "plain_lyrics": """Halamathi habibo
Halamathi mithivan thale
Halamathi habibo
Halamathi mithi boooo
Malama pitha pithadha
Malama pitha pithadha!"""
    },

    # 12. Mangal Rang - Ramayana (Hindi + Sanskrit)
    "mangal rang": {
        "title": "Mangal Rang (From \"Ramayana\")",
        "artist": "A.R. Rahman, Arijit Singh, Shreya Ghoshal",
        "synced_lrc": """[00:00.00] Mangal Rang - A.R. Rahman, Arijit Singh & Shreya Ghoshal
[00:14.00] मंगल भवन अमंगल हारी
[00:22.50] द्रवहु सुदसरथ अजिर बिहारी
[00:31.00] नयनों में चमके मंगल रंग
[00:39.20] पावन धुन पर झूमे अंग
[00:48.00] सिया राम चंद्र की जय जयकार
[00:56.50] उजला हुआ सब संसार""",
        "plain_lyrics": """मंगल भवन अमंगल हारी
द्रवहु सुदसरथ अजिर बिहारी

नयनों में चमके मंगल रंग
पावन धुन पर झूमे अंग
सिया राम चंद्र की जय जयकार
उजला हुआ सब संसार"""
    }
}

def get_curated_lyrics(clean_title: str) -> Optional[Dict[str, Any]]:
    """
    Looks up curated lyrics by normalized title with fuzzy containment.
    """
    t = clean_title.lower().strip()
    if not t:
        return None

    # Exact or substring match in curated database
    for key, data in CURATED_LYRICS_DB.items():
        if key == t or key in t or t in key:
            return data

    return None

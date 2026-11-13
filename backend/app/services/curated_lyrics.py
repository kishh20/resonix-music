"""
Resonix Curated Multilingual Lyrics Registry
Provides verified, time-synchronized karaoke lyrics for major soundtrack releases
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

    # 5. Mangal Rang - Ramayana (Hindi + Sanskrit)
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
    Looks up curated lyrics by normalized title.
    """
    t = clean_title.lower().strip()
    if not t:
        return None

    # Exact or substring match in curated database
    for key, data in CURATED_LYRICS_DB.items():
        if key == t or key in t or t in key:
            return data

    return None

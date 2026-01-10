import requests
import json
import os
from datetime import datetime, timezone
from time import sleep

data = [] #{id:compID, date:"DD MM YYYY", winner:{id:playerID, name:playerName}}


def save():
    with open("data.json", "w") as f:
        json.dump(data, f, indent=2)

def load():
    global data
    with open("data.json", "r") as f:
        data = json.load(f)

def getCompIDs():
    global data
    url = "https://trackmania.io/api/cotd/{index}?platform=crossplay"
    headers = {
        "Accept": "*/*",
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/143.0.0.0 Safari/537.36"
        )
    }

    i = 0
    while True:
        response = requests.get(url.format(index=i), headers=headers)
        
        if response.status_code != 200:
            print(response.status_code, response.text)
            break

        response_data = response.json()

        if len(response_data["competitions"]) == 0:
            break


        for comp in response_data["competitions"]:
            if "#1" not in comp["name"] and "#" in comp["name"]: continue #filter out reruns

            compId = comp["id"]
            if any(item["id"] == compId for item in data): return #already downloaded this cotd

            date = datetime.fromtimestamp(comp["starttime"], tz=timezone.utc).strftime("%d %m %Y")
            data.append({"id":compId, "date":date})

        sleep(1.5) #delay to throttle to 40 reqests/min
        i += 1


def getWinners():
    url = "https://trackmania.io/api/comp/{id}/leaderboard/0"
    headers = {
        "Accept": "*/*",
        "Accept-Language": "de-DE,de;q=0.9,de-CH;q=0.8,en;q=0.7,en-GB;q=0.6,en-US;q=0.5",
        "Cache-Control": "no-cache",
        "Pragma": "no-cache",
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/143.0.0.0 Safari/537.36"
        ),
        "Sec-CH-UA": '"Google Chrome";v="143", "Chromium";v="143", "Not A(Brand";v="24"',
        "Sec-CH-UA-Mobile": "?0",
        "Sec-CH-UA-Platform": '"Windows"',
        "Referer": "https://trackmania.io/",
    }

    for cotd in data:
        if "winner" in cotd:continue #winner allready saved

        response = requests.get(url.format(id=cotd["id"]), headers=headers)

        if response.status_code != 200:
            print(response.status_code, response.text)
            break
        
   
        response_data = response.json()

        if response_data["participants"] == None: 
            sleep(1.5)
            continue #match not finished yet

        winner = response_data["participants"][0]
        if winner["score"] == 0: cotd["winner"] = None #no data from then (cotd to old)
        else:                    cotd["winner"] = {"id":winner["player"]["id"], "name":winner["player"]["name"]}

        save()
        sleep(1.5) #delay to throttle to 40 reqests/min


#load data from file
load()

#get new COTDs
getCompIDs()

#get winners from new COTDs
getWinners()

#sort data by compID
data = sorted(data, key=lambda x: x["id"])

#save data to file
save()
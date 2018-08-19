const HEX = 16,
    clientId = '1x59tb2nluf1dgnx5aqazviiibft56',
    tokenItem = 'token',
    stateItem = 'state',
    scopes = 'analytics:read:extensions',
    login = document.getElementById("login"),
    refresh = document.getElementById("refresh"),
    list = document.querySelector("#extensions ul"),
    populateList = (token) => {
        fetch(`https://api.twitch.tv/helix/analytics/extensions?type=overview_v2&first=100`, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        }).then((response) => {
            if(response.ok && response.status === 200) {
                return response.json();
            }
            throw new Error(`HTTP error ${response.statusText}`);
        }).then((json) => {
            //TODO pagination (yeah, I'll do that when someone complains that has more than 100 extensions...)
            for(const extension of json.data) {
                if(extension.type === "overview_v2") {
                    const item = document.createElement("li"),
                        link = document.createElement("a");
                    link.href = extension.URL;
                    link.download = true;
                    link.textContent = extension.extension_id;
                    item.append(link);
                    list.append(item);
                }
            }
            refresh.hidden = true;
            // URLs are no longer valid after 1 minute.
            setTimeout(() => {
                while(list.firstElementChild) {
                    list.firstElementChild.remove();
                }
                refresh.hidden = false;
            }, 60000);
        }).catch(console.error);
    };
let authorized = false;

if(location.hash.length > 1 || localStorage.getItem(tokenItem)) {
    let token = localStorage.getItem(tokenItem);
    if(location.hash.length > 1 && localStorage.getItem(stateItem)) {
        const params = new URLSearchParams(location.hash.substr(1));
        if(params.get('state') === localStorage.getItem(stateItem) && params.get('scope') === scopes) {
            token = params.get('access_token');
            localStorage.setItem(tokenItem, token);
            localStorage.removeItem(stateItem);
        }
        else {
            throw new Error("Couldn't authorize");
        }
    }
    else if(!token) {
        throw new Error("Invalid application state");
    }

    authorized = true;
    login.textContent = "Logout";

    populateList(token);
}

login.addEventListener("click", () => {
    if(authorized) {
        localStorage.removeItem(tokenItem);
        location.hash = '';
        location.reload();
    }
    else {
        const state = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER).toString(HEX);
        localStorage.setItem(stateItem, state);
        window.location = `https://id.twitch.tv/oauth2/authorize?client_id=${clientId}&redirect_uri=${location.origin}${location.pathname}${location.search}&response_type=token&scope=${scopes}&state=${state}`;
    }
}, {
    passive: true
});

refresh.addEventListener("click", () => {
    if(authorized) {
        populateList(localStorage.getItem(tokenItem));
    }
}, {
    passive: true
});

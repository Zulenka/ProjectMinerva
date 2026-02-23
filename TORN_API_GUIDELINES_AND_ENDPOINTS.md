# Torn API Rules, Guidelines, and Endpoint Reference

Generated on: 2026-02-23 04:05:57 -05:00

Sources:
- https://www.torn.com/api.html
- https://www.torn.com/swagger.php
- https://www.torn.com/swagger/openapi.json

## Scope

This document consolidates Torn API usage rules/guidelines from the official API documentation page and includes the endpoints currently exposed in Torn's Swagger/OpenAPI reference (v2).

## Official Rules and Guidelines (from `api.html`)

### Terms and eligibility

- You must comply with Torn's Terms and Conditions when using the API.
- Access may be restricted or disabled for users in Federal Jail or with under 250 total game turns.
- Legacy API v1 is marked as no longer actively updated; Torn recommends using API v2 for new work.

### Authentication and key handling

- The API key identifies the owner and should be kept private.
- Do not share API keys or expose them in public code, browser storage visible to others, screenshots, or logs.
- API calls are typically made by passing the key as a `key` parameter in the request.
- Torn recommends generating separate keys for separate applications so a compromised key can be revoked without affecting other tools.

### Transport and request format

- Requests use HTTP GET to Torn API endpoints (https://api.torn.com/...).
- Parameters are passed via the query string (for example: selections, IDs, and your API key).
- JSON is the default response format; XML exists in v1 for compatibility but is considered legacy.

### Rate limits and fair use

- Torn enforces request limits and returns errors when limits are exceeded.
- Limits can vary depending on endpoint, key type, and internal protections; design clients to handle throttling gracefully.
- Cache results when possible and avoid unnecessary polling/spam requests.
- Respect server load and avoid abuse patterns (tight loops, parallel bursts, or repeated full-data pulls).

### Error handling and resilience

- Always check API error responses and handle them explicitly instead of assuming success.
- Build retry logic with backoff for transient failures (network issues / temporary API failures), but do not aggressively retry rate-limit responses.
- Validate that requested selections/fields are present because endpoint schemas can evolve.

### Security and data usage

- Request only the minimum scopes/permissions needed.
- Treat user/faction/company data as sensitive and store it securely.
- Do not misuse the API for cheating, automation that violates Torn rules, or abusive scraping.
- If an application is distributed, provide a way for users to revoke/replace their API key.

### Versioning and maintenance guidance

- Prefer API v2 endpoints for new integrations.
- Expect changes/additions over time and monitor Torn documentation for updates.
- Keep endpoint-specific logic isolated so you can adapt to schema changes without breaking the full app.

## Swagger / OpenAPI Endpoint Inventory (Torn API v2)

Summary:
- Path count: 184
- Operation count: 184

### `/faction`
- `GET` - Get any Faction selection (`getFactionGeneric`) [Tags: Faction]

### `/faction/{chainId}/chainreport`
- `GET` - Get a chain report (`getChainReport`) [Tags: Faction]

### `/faction/{crimeId}/crime`
- `GET` - Get a specific organized crime (`getMyFactionOrganizedCrime`) [Tags: Faction]

### `/faction/{id}/basic`
- `GET` - Get a faction's basic details (`getFactionBasicInformation`) [Tags: Faction]

### `/faction/{id}/chain`
- `GET` - Get a faction's current chain (`getFactionChain`) [Tags: Faction]

### `/faction/{id}/chains`
- `GET` - Get a list of a faction's completed chains (`getFactionCompletedChains`) [Tags: Faction]

### `/faction/{id}/hof`
- `GET` - Get a faction's hall of fame rankings. (`getFactionHoF`) [Tags: Faction]

### `/faction/{id}/members`
- `GET` - Get a list of a faction's members (`getFactionMembers`) [Tags: Faction]

### `/faction/{id}/raids`
- `GET` - Get a faction's raids history (`getFactionRaidsHistory`) [Tags: Faction]

### `/faction/{id}/rankedwars`
- `GET` - Get a faction's ranked wars history (`getFactionRankedWarsHistory`) [Tags: Faction]

### `/faction/{id}/territory`
- `GET` - Get a list of a faction's territories (`getFactionTerritory`) [Tags: Faction]

### `/faction/{id}/territorywars`
- `GET` - Get a faction's territory wars history (`getFactionTerritoryWarsHistory`) [Tags: Faction]

### `/faction/{id}/wars`
- `GET` - Get a faction's wars & pacts details (`getFactionWars`) [Tags: Faction]

### `/faction/{raidWarId}/raidreport`
- `GET` - Get raid war details (`getRaidReport`) [Tags: Faction]

### `/faction/{rankedWarId}/rankedwarreport`
- `GET` - Get ranked war details (`getRankedWarReport`) [Tags: Faction]

### `/faction/{territoryWarId}/territorywarreport`
- `GET` - Get territory war details (`getTerritoryWarReport`) [Tags: Faction]

### `/faction/applications`
- `GET` - Get your faction's applications (`getMyFactionApplications`) [Tags: Faction]

### `/faction/attacks`
- `GET` - Get your faction's detailed attacks (`getMyFactionAttacks`) [Tags: Faction]

### `/faction/attacksfull`
- `GET` - Get your faction's simplified attacks (`getMyFactionAttacksSimplified`) [Tags: Faction]

### `/faction/balance`
- `GET` - Get your faction's & member's balance details (`getMyFactionBalance`) [Tags: Faction]

### `/faction/basic`
- `GET` - Get your faction's basic details (`getMyFactionBasicInformation`) [Tags: Faction]

### `/faction/chain`
- `GET` - Get your faction's current chain (`getMyFactionChain`) [Tags: Faction]

### `/faction/chainreport`
- `GET` - Get your faction's latest chain report (`getMyFactionLatestChainReport`) [Tags: Faction]

### `/faction/chains`
- `GET` - Get a list of your faction's completed chains (`getMyFactionCompletedChains`) [Tags: Faction]

### `/faction/contributors`
- `GET` - Get your faction's challenge contributors (`getMyFactionContributors`) [Tags: Faction]

### `/faction/crimes`
- `GET` - Get your faction's organized crimes (`getMyFactionOrganizedCrimes`) [Tags: Faction]

### `/faction/hof`
- `GET` - Get your faction's hall of fame rankings. (`getMyFactionHoF`) [Tags: Faction]

### `/faction/lookup`
- `GET` (`getFactionLookup`) [Tags: Faction]

### `/faction/members`
- `GET` - Get a list of your faction's members (`getMyFactionMembers`) [Tags: Faction]

### `/faction/news`
- `GET` - Get your faction's news details (`getMyFactionNews`) [Tags: Faction]

### `/faction/positions`
- `GET` - Get your faction's positions details (`getMyFactionPositions`) [Tags: Faction]

### `/faction/rackets`
- `GET` - Get a list of current rackets (`getFactionRackets`) [Tags: Faction]

### `/faction/raids`
- `GET` - Get raids history for your faction (`getMyFactionRaidsHistory`) [Tags: Faction]

### `/faction/rankedwars`
- `GET` - Get ranked wars history for your faction (`getMyFactionRankedWarsHistory`) [Tags: Faction]

### `/faction/reports`
- `GET` - Get faction reports (`getMyFactionReports`) [Tags: Faction]

### `/faction/revives`
- `GET` - Get your faction's detailed revives (`getMyFactionRevives`) [Tags: Faction]

### `/faction/revivesFull`
- `GET` - Get your faction's simplified revives (`getMyFactionRevivesSimplified`) [Tags: Faction]

### `/faction/search`
- `GET` - Search factions by name or other criteria (`getFactionSearch`) [Tags: Faction]

### `/faction/stats`
- `GET` - Get your faction's challenges stats (`getMyFactionStats`) [Tags: Faction]

### `/faction/territory`
- `GET` - Get a list of your faction's territories (`getMyFactionTerritory`) [Tags: Faction]

### `/faction/territoryownership`
- `GET` - Get a list territory ownership (`getTerritoryOwnership`) [Tags: Faction]

### `/faction/territorywars`
- `GET` - Get territory wars history for your faction (`getMyFactionTerritoryWarsHistory`) [Tags: Faction]

### `/faction/timestamp`
- `GET` - Get current server time (`getFactionTimestamp`) [Tags: Faction]

### `/faction/upgrades`
- `GET` - Get your faction's upgrades (`getMyFactionUpgrades`) [Tags: Faction]

### `/faction/warfare`
- `GET` - Get faction warfare (`getWarfare`) [Tags: Faction]

### `/faction/wars`
- `GET` - Get your faction's wars & pacts details (`getMyFactionWars`) [Tags: Faction]

### `/forum`
- `GET` - Get any Forum selection (`getForumGeneric`) [Tags: Forum]

### `/forum/{categoryIds}/threads`
- `GET` - Get threads for specific public forum category or categories (`getForumThreads`) [Tags: Forum]

### `/forum/{threadId}/posts`
- `GET` - Get specific forum thread posts (`getForumThreadPosts`) [Tags: Forum]

### `/forum/{threadId}/thread`
- `GET` - Get specific thread details (`getForumThread`) [Tags: Forum]

### `/forum/categories`
- `GET` - Get publicly available forum categories (`getForumCategories`) [Tags: Forum]

### `/forum/lookup`
- `GET` - Get all available forum selections (`getForumLookup`) [Tags: Forum]

### `/forum/threads`
- `GET` - Get threads across all forum categories (`getForumAllThreads`) [Tags: Forum]

### `/forum/timestamp`
- `GET` - Get current server time (`getForumTimestamp`) [Tags: Forum]

### `/key`
- `GET` - Get any Key selection (`getKeyGeneric`) [Tags: Key]

### `/key/info`
- `GET` - Get current key info (`getKeyInfo`) [Tags: Key]

### `/key/log`
- `GET` - Get current key log history (`getKeyLog`) [Tags: Key]

### `/market`
- `GET` - Get any Market selection (`getMarketGeneric`) [Tags: Market]

### `/market/{id}/auctionhouse`
- `GET` - Get specific item auction house listings (`getMarketAuctionHouseItem`) [Tags: Market]

### `/market/{id}/auctionhouselisting`
- `GET` - Get specific item auction house listings (`getMarketAuctionHouseListing`) [Tags: Market]

### `/market/{id}/bazaar`
- `GET` - Get item specialized bazaar directory (`getMarketBazaarItem`) [Tags: Market]

### `/market/{id}/itemmarket`
- `GET` - Get item market listings (`getMarketItemMarketItem`) [Tags: Market]

### `/market/{propertyTypeId}/properties`
- `GET` - Get properties market listings (`getMarketProperties`) [Tags: Market]

### `/market/{propertyTypeId}/rentals`
- `GET` - Get properties rental listings (`getMarketPropertiesRental`) [Tags: Market]

### `/market/auctionhouse`
- `GET` - Get auction house listings (`getMarketAuctionHouse`) [Tags: Market]

### `/market/bazaar`
- `GET` - Get bazaar directory (`getMarketBazaar`) [Tags: Market]

### `/market/lookup`
- `GET` - Get all available market selections (`getMarketLookup`) [Tags: Market]

### `/market/timestamp`
- `GET` - Get current server time (`getMarketTimestamp`) [Tags: Market]

### `/property`
- `GET` - Get any property selection (`getPropertyGeneric`) [Tags: Property]

### `/property/{id}/property`
- `GET` - Get a specific property (`getProperty`) [Tags: Property]

### `/property/lookup`
- `GET` - Get all available property selections (`getPropertyLookup`) [Tags: Property]

### `/property/timestamp`
- `GET` - Get current server time (`getPropertyTimestamp`) [Tags: Property]

### `/racing`
- `GET` - Get any Racing selection (`getRacingGeneric`) [Tags: Racing]

### `/racing/{raceId}/race`
- `GET` - Get specific race details (`getRacingRaceDetails`) [Tags: Racing]

### `/racing/{trackId}/records`
- `GET` - Get track records (`getRacingTrackRecords`) [Tags: Racing]

### `/racing/cars`
- `GET` - Get cars and their racing stats (`getRacingCars`) [Tags: Racing]

### `/racing/carupgrades`
- `GET` - Get all possible car upgrades (`getRacingCarUpgrades`) [Tags: Racing]

### `/racing/lookup`
- `GET` - Get all available racing selections (`getRacingLookup`) [Tags: Racing]

### `/racing/races`
- `GET` - Get races (`getRacingRaces`) [Tags: Racing]

### `/racing/timestamp`
- `GET` - Get current server time (`getRacingTimestamp`) [Tags: Racing]

### `/racing/tracks`
- `GET` - Get race tracks and descriptions (`getRacingTracks`) [Tags: Racing]

### `/torn`
- `GET` - Get any Torn selection (`getTornGeneric`) [Tags: Torn]

### `/torn/{crimeId}/subcrimes`
- `GET` - Get Subcrimes information (`getTornSubcrimes`) [Tags: Torn]

### `/torn/{id}/eliminationteam`
- `GET` - Get players in a specific elimination team (`getTornEliminationTeam`) [Tags: Torn]

### `/torn/{id}/itemdetails`
- `GET` - Get information about a specific item (`getTornItemDetails`) [Tags: Torn]

### `/torn/{ids}/honors`
- `GET` - Get specific honors (`getTornHonorsSpecific`) [Tags: Torn]

### `/torn/{ids}/items`
- `GET` - Get information about items (`getTornItemsSpecific`) [Tags: Torn]

### `/torn/{ids}/medals`
- `GET` - Get specific medals (`getTornMedalsSpecific`) [Tags: Torn]

### `/torn/{logCategoryId}/logtypes`
- `GET` - Get available log ids for a specific log category (`getTornLogTypesSpecific`) [Tags: Torn]

### `/torn/attacklog`
- `GET` - Get attack log details (`getTornAttackLog`) [Tags: Torn]

### `/torn/bounties`
- `GET` - Get bounties (`getTornBounties`) [Tags: Torn]

### `/torn/calendar`
- `GET` - Get calendar information (`getTornCalendar`) [Tags: Torn]

### `/torn/crimes`
- `GET` - Get crimes information (`getTornCrimes`) [Tags: Torn]

### `/torn/education`
- `GET` - Get education information (`getTornEducation`) [Tags: Torn]

### `/torn/elimination`
- `GET` - Get current standings for all elimination teams (`getTornElimination`) [Tags: Torn]

### `/torn/factionhof`
- `GET` - Get faction hall of fame positions for a specific category (`getTornFactionHoF`) [Tags: Torn]

### `/torn/factiontree`
- `GET` - Get full faction tree (`getTornFactionTree`) [Tags: Torn]

### `/torn/hof`
- `GET` - Get player hall of fame positions for a specific category (`getTornHoF`) [Tags: Torn]

### `/torn/honors`
- `GET` - Get all honors (`getTornHonors`) [Tags: Torn]

### `/torn/itemammo`
- `GET` - Get information about ammo (`getTornItemAmmo`) [Tags: Torn]

### `/torn/itemmods`
- `GET` - Get information about weapon upgrades (`getTornItemMods`) [Tags: Torn]

### `/torn/items`
- `GET` - Get information about items (`getTornItems`) [Tags: Torn]

### `/torn/logcategories`
- `GET` - Get available log categories (`getTornLogCategories`) [Tags: Torn]

### `/torn/logtypes`
- `GET` - Get all available log ids (`getTornLogTypes`) [Tags: Torn]

### `/torn/lookup`
- `GET` - Get all available torn selections (`getTornLookup`) [Tags: Torn]

### `/torn/medals`
- `GET` - Get all medals (`getTornMedals`) [Tags: Torn]

### `/torn/merits`
- `GET` - Get all merits (`getTornMerits`) [Tags: Torn]

### `/torn/organizedcrimes`
- `GET` - Get organized crimes information (`getTornOrganizedCrimes`) [Tags: Torn]

### `/torn/properties`
- `GET` - Get properties details (`getTornProperties`) [Tags: Torn]

### `/torn/territory`
- `GET` - Get territory details (`getTornTerritory`) [Tags: Torn]

### `/torn/timestamp`
- `GET` - Get current server time (`getTornTimestamp`) [Tags: Torn]

### `/user`
- `GET` - Get any User selection (`getUserGeneric`) [Tags: User]

### `/user/{crimeId}/crimes`
- `GET` - Get your crime statistics (`getMyCrimes`) [Tags: User]

### `/user/{id}/basic`
- `GET` - Get basic profile information for a specific user (`getUserBasicInformation`) [Tags: User]

### `/user/{id}/bounties`
- `GET` - Get bounties placed on a specific user (`getUserBounties`) [Tags: User]

### `/user/{id}/competition`
- `GET` - Get competition information for a specific player (`getUserCompetitionInfo`) [Tags: User]

### `/user/{id}/discord`
- `GET` - Get discord information for a specific user (`getUserDiscord`) [Tags: User]

### `/user/{id}/faction`
- `GET` - Get faction information for a specific player (`getUserFaction`) [Tags: User]

### `/user/{id}/forumposts`
- `GET` - Get posts for a specific player (`getUserForumPosts`) [Tags: User]

### `/user/{id}/forumthreads`
- `GET` - Get threads for a specific player (`getUserForumThreads`) [Tags: User]

### `/user/{id}/hof`
- `GET` - Get hall of fame rankings for a specific player (`getUserHoF`) [Tags: User]

### `/user/{id}/icons`
- `GET` - Get icons information for a specific player (`getUserIcons`) [Tags: User]

### `/user/{id}/job`
- `GET` - Get job information for a specific player (`getUserJob`) [Tags: User]

### `/user/{id}/personalstats`
- `GET` - Get a player's personal stats (`getUserPersonalStats`) [Tags: User]

### `/user/{id}/profile`
- `GET` - Get profile information for a specific player (`getUserProfile`) [Tags: User]

### `/user/{id}/properties`
- `GET` - Get specific user's properties (`getUserProperties`) [Tags: User]

### `/user/{id}/property`
- `GET` - Get specific user's property (`getUserProperty`) [Tags: User]

### `/user/ammo`
- `GET` - Get your ammo information (`getMyAmmo`) [Tags: User]

### `/user/attacks`
- `GET` - Get your detailed attacks (`getMyAttacks`) [Tags: User]

### `/user/attacksfull`
- `GET` - Get your simplified attacks (`getMyAttacksSimplified`) [Tags: User]

### `/user/bars`
- `GET` - Get your bars information (`getMyBars`) [Tags: User]

### `/user/basic`
- `GET` - Get your basic profile information (`getMyBasicInformation`) [Tags: User]

### `/user/battlestats`
- `GET` - Get your battlestats (`getMyBattlestats`) [Tags: User]

### `/user/bounties`
- `GET` - Get bounties placed on you (`getMyBounties`) [Tags: User]

### `/user/calendar`
- `GET` - Get your calendar events start time (`getMyCalendarTime`) [Tags: User]

### `/user/competition`
- `GET` - Get your competition information (`getMyCompetitionInfo`) [Tags: User]

### `/user/cooldowns`
- `GET` - Get your cooldowns information (`getMyCooldowns`) [Tags: User]

### `/user/discord`
- `GET` - Get your discord information (`getMyDiscord`) [Tags: User]

### `/user/education`
- `GET` - Get your education information (`getMyEducation`) [Tags: User]

### `/user/enlistedcars`
- `GET` - Get your enlisted cars (`getMyEnlistedCars`) [Tags: User]

### `/user/equipment`
- `GET` - Get your equipment & clothing (`getMyEquipment`) [Tags: User]

### `/user/events`
- `GET` - Get your events (`getMyEvents`) [Tags: User]

### `/user/faction`
- `GET` - Get your faction information (`getMyFaction`) [Tags: User]

### `/user/forumfeed`
- `GET` - Get updates on your threads and posts (`getMyForumFeed`) [Tags: User]

### `/user/forumfriends`
- `GET` - Get updates on your friends' activity (`getMyForumFriendsUpdates`) [Tags: User]

### `/user/forumposts`
- `GET` - Get your posts (`getMyForumPosts`) [Tags: User]

### `/user/forumsubscribedthreads`
- `GET` - Get updates on threads you subscribed to (`getMyForumSubscribedThreads`) [Tags: User]

### `/user/forumthreads`
- `GET` - Get your threads (`getMyForumThreads`) [Tags: User]

### `/user/hof`
- `GET` - Get your hall of fame rankings (`getMyHoF`) [Tags: User]

### `/user/honors`
- `GET` - Get your achieved honors (`getMyHonors`) [Tags: User]

### `/user/icons`
- `GET` - Get your icons information (`getMyIcons`) [Tags: User]

### `/user/itemmarket`
- `GET` - Get your item market listings (`getMyItemMarketListings`) [Tags: User]

### `/user/job`
- `GET` - Get your job information (`getMyJob`) [Tags: User]

### `/user/jobpoints`
- `GET` - Get your jobpoints (`getMyJobPoints`) [Tags: User]

### `/user/jobranks`
- `GET` - Get your starter job positions (`getMyJobRanks`) [Tags: User]

### `/user/list`
- `GET` - Get your friends, enemies or targets list (`getMyContactsList`) [Tags: User]

### `/user/log`
- `GET` - Get your logs (`getMyLogs`) [Tags: User]

### `/user/lookup`
- `GET` - Get all available user selections (`getUserLookup`) [Tags: User]

### `/user/medals`
- `GET` - Get your achieved medals (`getMyMedals`) [Tags: User]

### `/user/merits`
- `GET` - Get your merits (`getMyMerits`) [Tags: User]

### `/user/messages`
- `GET` - Get your messages (`getMyMessages`) [Tags: User]

### `/user/missions`
- `GET` - Get your current missions information (`getMyMissions`) [Tags: User]

### `/user/money`
- `GET` - Get your current wealth (`getMyMoney`) [Tags: User]

### `/user/newevents`
- `GET` - Get your unseen events (`getMyNewEvents`) [Tags: User]

### `/user/newmessages`
- `GET` - Get your unseen messages (`getMyNewMessages`) [Tags: User]

### `/user/notifications`
- `GET` - Get your notifications (`getMyNotifications`) [Tags: User]

### `/user/organizedcrime`
- `GET` - Get your current ongoing organized crime (`getMyOrganizedCrime`) [Tags: User]

### `/user/organizedcrimes`
- `GET` - Get available slots for organized crimes with status 'Recruiting' (`getMyAvailableOrganizedCrimes`) [Tags: User]

### `/user/personalstats`
- `GET` - Get your personal stats (`getMyPersonalStats`) [Tags: User]

### `/user/profile`
- `GET` - Get your own profile (`getMyProfile`) [Tags: User]

### `/user/properties`
- `GET` - Get your own properties (`getMyProperties`) [Tags: User]

### `/user/property`
- `GET` - Get your current property (`getMyProperty`) [Tags: User]

### `/user/races`
- `GET` - Get user races (`getMyRaces`) [Tags: User]

### `/user/racingrecords`
- `GET` - Get your current racing records (`getMyRacingRecords`) [Tags: User]

### `/user/refills`
- `GET` - Get your refills information (`getMyRefills`) [Tags: User]

### `/user/reports`
- `GET` - Get your reports (`getMyReports`) [Tags: User]

### `/user/revives`
- `GET` - Get your detailed revives (`getMyRevives`) [Tags: User]

### `/user/revivesFull`
- `GET` - Get your simplified revives (`getMyRevivesSimplified`) [Tags: User]

### `/user/skills`
- `GET` - Get your skills (`getMySkills`) [Tags: User]

### `/user/timestamp`
- `GET` - Get current server time (`getUserTimestamp`) [Tags: User]

### `/user/travel`
- `GET` - Get your travel information (`getMyTravelInformation`) [Tags: User]

### `/user/virus`
- `GET` - Get your virus coding information (`getMyVirusCodingInformation`) [Tags: User]

### `/user/weaponexp`
- `GET` - Get your weapon experience information (`getMyWeaponExp`) [Tags: User]

### `/user/workstats`
- `GET` - Get your working stats (`getMyWorkstats`) [Tags: User]



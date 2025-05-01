# <img src="https://avatars.githubusercontent.com/u/144374735" style="height: 24px;"> foss-[hydraulisc](https://hydraulisc.net)
Hydraulisc; Open Source, privay focused, image-sharing Social Media.

# [Live Site/Main Instance](https://hydraulisc.net)! Now Features OAuth2.

- [Info regarding repository](https://blog.hydraulisc.xyz/?entry=E0Mczt2lGeyib93YSqhB)
- [Roadmap](https://blog.hydraulisc.xyz/?entry=haulisc-roadmap)
- Hydraulisc's [About Site](https://about.hydraulisc.net/), [Help Center](https://about.hydraulisc.net/help/) & [Documentation](https://about.hydraulisc.net/docs/hydraulisc/)
- [Discord](https://discord.gg/Syn5GVDemH)

# Migrating
## Warning!
If you are migrating from Hydraulisc version 1.3 or earlier, you need to perform v1 database migrations!

`node migrate-database-v1.js`

If you are migrating from version 1.3 (or older) to a newer version you need to perform v3 database migrations to support discriminators!

`node migrate-database-v3.js`

<details>
<summary>Features (WIP):</summary>
<ul>
    <li>Privacy Focused</li>
    <li>Username-only accounts for anonimity</li>
    <li>Private, Invite-Only or Public modes</li>
    <li>Direct Invite links</li>
    <li>Uploaded files mimetype checks</li>
    <li>XSS Upload Preventions (sanitize text before upload)</li>
    <li>XSS Rendering Preventions (sanitize and render)</li>
</ul>
</details>

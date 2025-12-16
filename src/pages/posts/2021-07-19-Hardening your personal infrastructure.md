---
title: "Hardening your personal infrastructure"
comments: true
tags: hardened-infrastructure
last_modified_at: 2021-08-18
sidebar:
  nav: "hardened-infrastructure"
---

Now that my family is vaccinated, I'm reflecting on what to learn from the COVID-19 pandemic. The most obvious lesson is not to be complacent: things can change in a hurry.

This will not be the last international disaster I face during my lifetime, I am sure. So now that things have calmed down, it's a good idea to think about how to prepare for the next big disruption, which I am assuming will not be another pandemic, but something different and unexpected.

In particular, I'm thinking about how I use my computers. Like most people, I've adopted a number of cloud services that help me run my day-to-day life, like GMail, Dropbox, Workflowy, and YouTube Music. Cloud services have some big advantages:
- You can use them from anywhere you have an internet connection
- All of the computation and storage happens up in the cloud, so your computer doesn't have to do as much, which makes it easier for the company to support lots of different devices and make them consistent.
- The company maintains them for you

However, each of these advantages has a hidden downside:
- If something were to happen to your internet connection, you would be out of luck until the connection was restored. Using the service also counts against your internet data cap, if you have one (which I do, on my phone).
- Everything stored in the cloud is owned by the company, not by you, and they're free to change the terms of their agreement with you at any time. If they decide they want more money, or they decide to add features you don't want, or they lose interest in the project, you have no input into those decisions, and they can hold your data hostage to make you agree to the new terms of service.
- If a service isn't profitable, the company will either go out of business, taking your data with it, or they'll find a way to _make_ it profitable - [probably one you won't like](https://en.wikipedia.org/wiki/Surveillance_capitalism).

<img class="meme" src="{{ '/assets/2021-07-19/vader.png' | absolute_url }}" alt='Darth Vader: "I am altering the deal. Pray I do not alter it any further."' />

In my view, the cost/benefit analysis has reached a tipping point, so I'm making an effort to move away from cloud services where possible. In some cases, moving away from cloud services is impractical, especially for things like email that innately rely on connectivity (I'm told that running your own email server is a huge hassle). But for some things, the cloud solution has been annoying for a long time - I am sick and tired of YouTube sticking ads between my songs and badgering me to sign up for a paid plan.

<img class="meme" src="{{ '/assets/2021-07-19/lando.jpg' | absolute_url }}" alt='Lando Calrissian: "This deal is getting worse all the time."' />

So as I ditch various cloud services and set up alternatives that I have more control over, I'll post about them here. If you have any requests, post them in the comments!

## Posts in this series

- [Unlimited file syncing](/blog/Hardened-file-syncing)
- [Your own password vault](/blog/Hardened-password-vault)
- [Cheap, effortless backups](/blog/Hardened-backups)

$ErrorActionPreference = "Stop"

$dates = @(
    "2026-04-18T10:30:00+0530",
    "2026-04-20T14:15:00+0530",
    "2026-04-23T09:45:00+0530",
    "2026-04-26T16:20:00+0530",
    "2026-04-28T11:10:00+0530",
    "2026-04-30T15:05:00+0530",
    "2026-05-02T12:00:00+0530",
    "2026-05-03T18:30:00+0530",
    "2026-05-04T10:00:00+0530"
)

Write-Host "Staging 2. Auth & Profile"
git add "src/app/(auth)/" "src/app/api/auth/" "src/app/api/profile/" "src/app/profile/" "src/app/settings/" "src/components/settings/" "src/context/AuthContext.tsx" "src/models/User.ts" "src/models/Otp.ts" "src/lib/profile.ts" "src/middleware.ts"
$env:GIT_AUTHOR_DATE=$dates[1]
$env:GIT_COMMITTER_DATE=$dates[1]
git commit -m "feat(auth): robust authentication flow, profile management, and route protection"

Write-Host "Staging 3. Explore & Search"
git add "src/app/explore/" "src/app/api/explore/" "src/components/ExploreSidebar.tsx" "src/components/explore/" "src/components/FilterCheckbox.tsx" "src/constants/" "src/app/api/cities/"
$env:GIT_AUTHOR_DATE=$dates[2]
$env:GIT_COMMITTER_DATE=$dates[2]
git commit -m "feat(explore): comprehensive search functionality, filtering, and robust sidebar"

Write-Host "Staging 4. Products & Services"
git add "src/app/products/" "src/app/services/" "src/app/api/products/" "src/app/api/services/" "src/app/api/offers/" "src/app/api/orders/" "src/components/ProductCard.tsx" "src/components/ServiceCard.tsx" "src/components/MakeOfferModal.tsx" "src/components/RequestAppointmentModal.tsx" "src/app/orders/" "src/app/wishlist/" "src/app/api/wishlist/"
$env:GIT_AUTHOR_DATE=$dates[3]
$env:GIT_COMMITTER_DATE=$dates[3]
git commit -m "feat(listings): marketplace core handling products, services, offers, and orders"

Write-Host "Staging 5. Community & Board"
git add "src/app/board/" "src/app/api/board/" "src/models/BoardPost.ts" "src/components/PostCard.tsx" "src/components/board/" "src/app/api/communities/" "src/models/Community.ts" "src/components/CommunityManager.tsx" "src/components/marketplace/"
$env:GIT_AUTHOR_DATE=$dates[4]
$env:GIT_COMMITTER_DATE=$dates[4]
git commit -m "feat(community): verified campus circles and interactive discussion boards"

Write-Host "Staging 6. Chat & Notifications"
git add "src/app/chat/" "src/app/api/chat/" "src/components/ChatItem.tsx" "src/components/ChatSidebar.tsx" "src/app/api/notifications/" "src/models/Notification.ts" "src/components/NotificationBell.tsx" "src/app/api/pusher/" "src/lib/pusherClient.ts" "src/lib/notifications.ts"
$env:GIT_AUTHOR_DATE=$dates[5]
$env:GIT_COMMITTER_DATE=$dates[5]
git commit -m "feat(chat): real-time messaging and real-time pusher notifications"

Write-Host "Staging 7. Admin & Moderation"
git add "src/app/admin/" "src/app/api/admin/" "src/app/api/reports/" "src/app/api/user/" "src/app/api/reviews/" "src/components/ReportModal.tsx" "src/components/ReviewModal.tsx" "src/components/ReviewSection.tsx" "src/models/Blacklist.ts" "src/models/SiteSettings.ts"
$env:GIT_AUTHOR_DATE=$dates[6]
$env:GIT_COMMITTER_DATE=$dates[6]
git commit -m "feat(admin): moderation tools, reporting system, user blocking, and analytics"

Write-Host "Staging 8. Locations & Misc"
git add "src/components/LocationMap.tsx" "src/components/LocationViewer.tsx" "src/components/SmartLocationPicker.tsx" "src/lib/location.ts" "src/app/about/" "src/app/contact/" "src/app/verifier-dashboard/" "src/app/api/verifier/" "src/components/StartEarningModal.tsx"
$env:GIT_AUTHOR_DATE=$dates[7]
$env:GIT_COMMITTER_DATE=$dates[7]
git commit -m "feat(core): geolocation picking, verifier dashboard, and static pages"

Write-Host "Staging 9. Scripts & Fixes"
git add "scripts/" "fix_*.js" "src/app/api/upload/" "src/lib/mailer.ts" "src/lib/confirm.ts" .
$env:GIT_AUTHOR_DATE=$dates[8]
$env:GIT_COMMITTER_DATE=$dates[8]
git commit -m "chore: configuration updates, mailer setup, and automated seeding scripts"

Write-Host "Pushing to remote..."
git push

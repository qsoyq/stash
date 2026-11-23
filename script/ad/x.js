/** @namespace x */

// Stash executes this file as an async function body. Do not redeclare injected globals.
function echo(...args) {
    console.log('[x-ad]', ...args)
}

function getScriptType() {
    return typeof $script !== 'undefined' ? $script.type : 'undefined'
}

function getScriptResponseBody() {
    const body = $response.body
    return typeof body === 'string' ? body : body == null ? '' : new TextDecoder('utf-8').decode(new Uint8Array(body))
}

async function get(params) {
    return new Promise((resolve, reject) => {
        $httpClient.get(params, (error, response, data) => {
            if (error) reject(new Error(String(error)))
            else resolve({ response, data })
        })
    })
}

function getXOptions() {
    const options = {
        block_ads_and_recommendations: true,
        hide_top_nav: true,
        hide_home_composer: true,
        hide_chat_drawer: true,
        hide_sidebar_trends: true,
        hide_nav_grok: true,
        hide_bottom_grok: true,
        hide_nav_premium: true,
        hide_nav_verified_orgs: true,
        hide_nav_jobs: true,
        hide_account_menu: true,
        hide_grok_drawer: true,
        hide_floating_post_button: true,
        hide_reply_permissions: true,
        hide_grok_actions: true,
        hide_translate_button: true,
        hide_automated_content: true,
        hide_probable_spam_prompt: true,
        enable_custom_layout: true,
        home_width_vw: 65,
        page_width_vw: 55,
        center_primary_column: true,
        enable_escape_back: true,
        enable_double_tap_back: false,
        enable_layout_diagnostics: false,
        hide_bottom_bar: false,
        hide_bottom_bar_on_scroll: true,
        hide_nav_notifications: false,
        hide_nav_messages: false,
        hide_notification_badge: false,
        hide_show_posts_prompt: false,
        enable_video_tools: true,
        enable_share_menu_download: false,
        video_save_method: 'browser',
    }
    if (typeof $argument === 'undefined' || !$argument) return options
    let supplied
    try {
        supplied = JSON.parse($argument)
    } catch (_) {
        console.log('[x-ad] 参数不是有效 JSON，使用默认设置')
        return options
    }
    if (!supplied || typeof supplied !== 'object' || Array.isArray(supplied)) return options
    for (const key of Object.keys(options)) {
        if (typeof options[key] === 'boolean' && typeof supplied[key] === 'boolean') {
            options[key] = supplied[key]
        } else if (typeof options[key] === 'number' && Number.isInteger(supplied[key]) && supplied[key] >= 30 && supplied[key] <= 100) {
            options[key] = supplied[key]
        } else if (key === 'video_save_method' && ['browser', 'system_share'].includes(supplied[key])) {
            options[key] = supplied[key]
        }
    }
    return options
}

// Runs only in the injected browser script. Keep helpers inside this function
// so serialization does not depend on Stash globals or external page libraries.
function removeAdsCode(options) {
    window.__stashXBlocker?.destroy()
    const hiddenClass = 'x-ad-hidden'
    const sidebarClass = 'x-ad-empty-sidebar'
    const autoHideBottomBar = options.hide_bottom_bar_on_scroll && !options.hide_bottom_bar
    const needsUpdates = Object.entries(options).some(([key, value]) =>
        !['enable_escape_back', 'enable_double_tap_back', 'enable_layout_diagnostics', 'enable_share_menu_download'].includes(key) && value === true)
    const simpleRules = [
        ['hide_chat_drawer', "[data-testid='chat-drawer-main']"],
        ['hide_nav_grok', "header a[aria-label='Grok'], header a[href='/i/grok']"],
        ['hide_nav_premium', "header a[aria-label='Premium'], header a[href='/i/premium_sign_up']"],
        ['hide_nav_verified_orgs', "header a[aria-label='Verified Orgs'], header a[href='/i/verified-orgs-signup']"],
        ['hide_nav_jobs', "header a[aria-label='Jobs'], header a[href='/jobs']"],
        ['hide_account_menu', "header button[aria-label='Account menu'], header [data-testid='SideNav_AccountSwitcher_Button']"],
        ['hide_floating_post_button', "[data-testid='FloatingActionButtonBase']"],
        ['hide_grok_drawer', "[data-testid='GrokDrawer']"],
        ['hide_grok_actions', "button[aria-label='Grok actions']"],
        ['hide_translate_button', "button[aria-label='Translate post']"],
        ['hide_reply_permissions', "[data-testid='tweetReplyRestrictions'], [data-testid='reply-restrictions']"],
        ['hide_sidebar_trends', "[data-testid='sidebarColumn'] [data-testid='trend'], [data-testid='sidebarColumn'] [data-testid='trends']"],
        ['block_ads_and_recommendations', "[data-testid='sidebarColumn'] [data-testid='premium-signup'], [data-testid='sidebarColumn'] [data-testid='super-upsell-UpsellCardRenderProperties']"],
    ].filter(([key]) => options[key])
    const style = document.createElement('style')
    style.id = 'x-ad-blocker-style'
    style.textContent = `
        .${hiddenClass}, .${sidebarClass} { display: none !important; }
        ${simpleRules.map(([, selector]) => `${selector} { display: none !important; }`).join('\n')}
        ${options.hide_top_nav ? `
        html.x-ad-hide-top-nav [data-testid='TopNavBar'] { display: none !important; }
        @media (min-width: 1000px) { [data-testid='TopNavBar'] { display: none !important; } }
        ` : ''}
        ${autoHideBottomBar ? `
        .x-ad-bottom-bar-autohide { transition: transform 0.2s ease, opacity 0.2s ease !important; }
        .x-ad-bottom-bar-collapsed {
            transform: translateY(calc(100% + env(safe-area-inset-bottom))) !important;
            opacity: 0 !important;
            pointer-events: none !important;
        }
        @media (prefers-reduced-motion: reduce) { .x-ad-bottom-bar-autohide { transition: none !important; } }
        ` : ''}
        ${options.enable_custom_layout ? `
        @media (min-width: 1000px) {
            div[data-testid='primaryColumn'] {
                width: ${options.page_width_vw}vw !important;
                max-width: 100% !important;
                min-width: 0 !important;
                flex: 0 1 ${options.page_width_vw}vw !important;
            }
            html.x-ad-home-layout div[data-testid='primaryColumn'] {
                width: ${options.home_width_vw}vw !important;
                flex-basis: ${options.home_width_vw}vw !important;
            }
        }` : ''}
    `

    const scopes = ['header', 'nav', "[data-testid='BottomBar']"]
    const scopedLinks = paths => scopes.flatMap(scope => paths.map(path => `${scope} a[href${path}]`)).join(', ')
    const notificationLinks = "a[data-testid='AppTabBar_Notifications_Link'], " + scopedLinks(["='/notifications'", "='/notifications/'"])
    const messageLinks = "a[data-testid='AppTabBar_DirectMessage_Link'], " + scopedLinks(["='/messages'", "='/messages/'", "^='/i/chat'"])
    const showPostsPattern = /^(?:Show|显示|顯示)\s*[\d.,]+\s*[KkMm万萬]?\s*(?:posts?|Tweets?|(?:条|個|个|篇|則|则)?\s*(?:帖子|贴子|推文|貼文))$/
    const detailPattern = /^\/[^/]+\/status\/\d+(?:\/|$)/
    const managed = new Map()
    const sidebarTargets = new Set()
    let bottomBarTargets = new Set()
    let barNodes = []
    let centered = null
    let column = null
    let sidebar = null
    let destroyed = false
    let paused = false
    let frame = null
    let fullUpdate = true
    let layoutDirty = true
    let barsDirty = true
    let scrollDirty = false
    let domDirty = false
    let roots = new Set()
    let path = new URL(window.location.href).pathname
    const previousHomeClass = document.documentElement.classList.contains('x-ad-home-layout')
    const previousTopNavClass = document.documentElement.classList.contains('x-ad-hide-top-nav')
    let scrollState = { lastY: currentScrollY(), distance: 0, direction: 0, collapsed: false }
    const listeners = []
    const historyHooks = []
    let observedLayout = []
    let touch = null
    let firstTap = null
    let lastTouchAt = -Infinity
    let lastBackAt = -Infinity

    function resetTaps() {
        touch = firstTap = null
    }

    // Only ordinary detail routes, never a photo/video viewer or a nested route.
    // Match the main article by its own timestamp permalink, not a quoted post's link.
    function backRegion(target) {
        const current = new URL(window.location.href).pathname.replace(/\/$/, '')
        if (destroyed || document.visibilityState === 'hidden' || !/^\/(?:[^/]+\/status|i\/web\/status)\/\d+$/.test(current)) return null
        if (!(target instanceof Element) || !target.isConnected || !target.closest("[data-testid='primaryColumn']")) return null
        const editable = 'input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="textbox"]'
        const excluded = `a, button, ${editable}, [role='button'], [role='link'], [role='menuitem'], [role='slider'], [role='checkbox'], [role='switch'], [role='tab'], img, video, audio, iframe, canvas, [data-testid='tweetPhoto'], [data-testid='videoPlayer'], [data-testid='card.wrapper'], [data-testid='quoteTweet'], [data-stash-layout-diagnostic], [data-stash-x-video]`
        if (target.closest(excluded) || document.activeElement?.closest(editable) || window.getSelection()?.toString().trim()) return null
        const overlays = document.querySelectorAll('[role="dialog"], [role="menu"], [aria-modal="true"]')
        if (Array.from(overlays).some(element => element.getClientRects().length && window.getComputedStyle(element).visibility !== 'hidden')) return null
        const article = target.closest('article')
        if (article) {
            const permalink = Array.from(article.querySelectorAll('a[href]')).some(link =>
                link.closest('article') === article && !link.parentElement.closest("[role='link'], [data-testid='quoteTweet']") && link.querySelector('time') &&
                new URL(link.getAttribute('href'), window.location.href).pathname.replace(/\/$/, '') === current)
            return permalink ? article : null
        }
        // Unrecognized timeline cells may have React click handlers without a role.
        if (target.closest("[data-testid='cellInnerDiv']")) return null
        return target.closest("[data-testid='primaryColumn']")
    }

    function gestureBack(event) {
        resetTaps()
        if (event.timeStamp - lastBackAt < 700) return
        lastBackAt = event.timeStamp
        event.preventDefault()
        event.stopPropagation()
        window.history.back()
    }

    function setClass(element, name, enabled) {
        if (element.classList.contains(name) !== enabled) element.classList.toggle(name, enabled)
    }

    function find(root, selector) {
        const matches = Array.from(root.querySelectorAll(selector))
        if (root instanceof Element && root.matches(selector)) matches.unshift(root)
        return matches
    }

    function navigationItem(element) {
        const stop = "body, main, header, nav, [role='navigation'], [data-testid='BottomBar'], [data-testid='primaryColumn'], #react-root, #layers"
        let target = element
        for (let parent = target.parentElement; parent && parent.children.length === 1 && !parent.matches(stop); parent = parent.parentElement) target = parent
        return target
    }

    function bottomBarContainer(bar) {
        let target = bar
        for (;;) {
            if (window.getComputedStyle(target).position === 'fixed') return target
            const parent = target.parentElement
            if (!parent || parent.children.length !== 1 || parent.matches("body, main, header, nav, [role='navigation'], [data-testid='primaryColumn'], #react-root, #layers")) break
            target = parent
        }
        return bar
    }

    function refreshBars() {
        barNodes = Array.from(document.querySelectorAll("[data-testid='BottomBar']"))
        const targets = new Set(barNodes.map(bottomBarContainer))
        bottomBarTargets.forEach(item => {
            if (!targets.has(item)) item.classList.remove('x-ad-bottom-bar-autohide', 'x-ad-bottom-bar-collapsed')
        })
        bottomBarTargets = targets
        bottomBarTargets.forEach(item => setClass(item, 'x-ad-bottom-bar-autohide', true))
        renderBars()
    }

    function renderBars() {
        bottomBarTargets.forEach(item => setClass(item, 'x-ad-bottom-bar-collapsed', scrollState.collapsed))
    }

    function maxScrollY() {
        return Math.max(0, document.documentElement.scrollHeight - window.innerHeight)
    }

    function currentScrollY() {
        const y = Math.max(0, window.scrollY || window.pageYOffset || 0)
        return Math.min(y, maxScrollY())
    }

    // A pure direction decision: accumulate small movements, but reset the
    // distance when direction reverses. Page-end rubber banding is clamped above.
    function nextScrollState(previous, y) {
        const delta = y - previous.lastY
        const direction = Math.sign(delta)
        const distance = direction && direction !== previous.direction ? delta : previous.distance + delta
        return {
            lastY: y,
            direction: direction || previous.direction,
            distance: y <= 8 ? 0 : distance,
            collapsed: y <= 8 ? false : Math.abs(distance) >= 8 ? distance > 0 : previous.collapsed,
        }
    }

    function notificationBadges(link) {
        const badges = []
        link.querySelectorAll('span, [aria-label]').forEach(element => {
            if (element.closest('svg') || element.querySelector('svg')) return
            const label = element.getAttribute('aria-label') || ''
            const text = element.textContent.trim()
            if (!/^\d+\+?$/.test(text) && !/unread|未读|未讀/i.test(label)) return
            if (!badges.some(badge => badge.contains(element))) badges.push(element)
        })
        return badges
    }

    function collect(root, hits) {
        function hide(element, reason) {
            if (!element) return
            if (!hits.has(element)) hits.set(element, new Set())
            hits.get(element).add(reason)
        }
        if (options.hide_home_composer && path === '/home') {
            find(root, "[data-testid='tweetTextarea_0']").forEach(composer => {
                const container = composer.closest("[data-testid='cellInnerDiv'], [data-testid='tweetComposer']")
                    || (composer.parentElement?.previousElementSibling?.matches("[role='progressbar']") ? composer.parentElement : null)
                hide(container, 'composer')
            })
        }
        if (options.hide_bottom_grok && window.innerWidth < 1000) {
            find(root, "nav a[href='/i/grok'], [data-testid='BottomBar'] a[href='/i/grok']").forEach(link => {
                if (!link.closest('header, article')) hide(link, 'bottom-grok')
            })
        }
        if (options.hide_bottom_bar) find(root, "[data-testid='BottomBar']").forEach(bar => hide(navigationItem(bar), 'bottom-bar'))
        if (options.hide_nav_notifications || options.hide_notification_badge) {
            find(root, notificationLinks).forEach(link => {
                if (link.closest('article')) return
                if (options.hide_nav_notifications) hide(navigationItem(link), 'notifications')
                if (options.hide_notification_badge) notificationBadges(link).forEach(badge => hide(badge, 'notification-badge'))
            })
        }
        if (options.hide_nav_messages) find(root, messageLinks).forEach(link => {
            if (!link.closest('article')) hide(navigationItem(link), 'messages')
        })
        if (options.block_ads_and_recommendations) {
            find(root, "[data-testid='sidebarColumn'] a[href^='/i/premium_sign_up']").forEach(link => hide(link.closest('aside, section') || link, 'premium'))
            find(root, "[data-testid='sidebarColumn'] aside").forEach(card => {
                if (card.querySelector("[data-testid='UserCell']")) hide(card, 'recommendation')
            })
        }
        if (options.hide_sidebar_trends) find(root, "[data-testid='sidebarColumn'] [data-testid='trend']").forEach(trend => hide(trend.closest('section') || trend, 'trends'))
        if (options.hide_reply_permissions && detailPattern.test(path)) {
            find(root, "[data-testid='primaryColumn'] [aria-live='polite']").forEach(region => {
                if (!region.closest('article') && ['Who can reply', '谁可以回复', '誰可以回覆'].includes(region.textContent.trim())) hide(region, 'reply-permissions')
            })
        }
        if (options.hide_show_posts_prompt || options.hide_probable_spam_prompt) {
            find(root, "[data-testid='primaryColumn'] [role='button'], [data-testid='primaryColumn'] button").forEach(button => {
                if (button.closest('article')) return
                const text = button.textContent.replace(/\s+/g, ' ').trim()
                if (options.hide_show_posts_prompt && showPostsPattern.test(text)) {
                    const cell = button.closest("[data-testid='cellInnerDiv']")
                    // A reused cell may contain both a prompt and a tweet: never hide the tweet.
                    hide(cell && !cell.querySelector('article') ? cell : button, 'show-posts')
                }
                if (options.hide_probable_spam_prompt && text === 'Show probable spam') hide(button, 'spam')
            })
        }
        if (options.hide_automated_content) {
            // Text in tweetText or an unstructured article is not metadata. Prefer
            // explicit automation labels, with author metadata as a narrow fallback.
            find(root, "[data-testid='primaryColumn'] [data-testid='automationLabel'], [data-testid='primaryColumn'] [data-testid='automatedLabel'], [data-testid='primaryColumn'] [data-testid='User-Name'] span").forEach(label => {
                if (label.closest("[data-testid='tweetText']") || label.textContent.trim() !== 'Automated') return
                const article = label.closest('article')
                if (article && !article.parentElement?.closest('article')) hide(article.closest("[data-testid='cellInnerDiv']") || article, 'automated')
            })
        }
    }

    function reconcile(changedRoots) {
        // A nested nav/cell update also invalidates its managed ancestors. Scan
        // those containers before replacing their reasons; scanning only the
        // descendant cannot rediscover a hidden card/container itself.
        const boundaries = new Set(changedRoots.map(root => {
            let boundary = root
            for (let parent = root.parentElement; parent; parent = parent.parentElement) {
                if (managed.has(parent)) boundary = parent
            }
            return boundary
        }))
        const expanded = Array.from(boundaries)
        changedRoots = expanded.filter(root => !expanded.some(other => other !== root && other.contains(root)))
        const hits = new Map()
        changedRoots.forEach(root => collect(root, hits))
        managed.forEach((reasons, element) => {
            if (!element.isConnected || changedRoots.some(root => root === document || root.contains(element) || element.contains(root))) {
                managed.delete(element)
                if (!hits.has(element)) setClass(element, hiddenClass, false)
            }
        })
        hits.forEach((reasons, element) => {
            managed.set(element, reasons)
            setClass(element, hiddenClass, true)
        })
    }

    function hasVisibleContent(element, ignoreOwnDisplay = false) {
        if (!ignoreOwnDisplay && managed.has(element)) return false
        const computed = window.getComputedStyle(element)
        if ((!ignoreOwnDisplay && computed.display === 'none') || computed.visibility === 'hidden') return false
        const text = Array.from(element.childNodes).some(node => node.nodeType === 3 && node.textContent.trim())
        if (text || element.matches('input, button, img, svg, video, canvas, iframe')) return true
        return Array.from(element.children).some(child => hasVisibleContent(child))
    }

    function restoreCenter() {
        if (!centered) return
        if (centered.element.style.getPropertyValue('transform') === centered.applied) {
            if (centered.original) centered.element.style.setProperty('transform', centered.original, centered.priority)
            else centered.element.style.removeProperty('transform')
        }
        centered = null
    }

    function updateLayout() {
        if (options.enable_custom_layout) setClass(document.documentElement, 'x-ad-home-layout', path.startsWith('/home'))
        if (options.hide_top_nav) {
            document.querySelectorAll("header[role='banner']").forEach(header => {
                const hasNavigation = header.querySelector("nav, a, button, input, [data-testid='TopNavBar']") !== null
                const collapse = window.innerWidth < 1000 && !path.startsWith('/explore') && !hasNavigation && !hasVisibleContent(header, true)
                const reasons = new Set(managed.get(header) || [])
                reasons.delete('banner')
                if (collapse) reasons.add('banner')
                if (reasons.size) managed.set(header, reasons)
                else managed.delete(header)
                setClass(header, hiddenClass, reasons.size > 0)
            })
        }
        column = document.querySelector("[data-testid='primaryColumn']")
        sidebar = document.querySelector("[data-testid='sidebarColumn']")
        sidebarTargets.forEach(old => { if (old !== sidebar) { setClass(old, sidebarClass, false); sidebarTargets.delete(old) } })
        // WebKit can report display:none for descendants of our collapsed sidebar.
        // Remove only our hiding class before measuring the site's own content.
        if (sidebar) setClass(sidebar, sidebarClass, false)
        const empty = sidebar && (options.block_ads_and_recommendations || options.hide_sidebar_trends) && !hasVisibleContent(sidebar, true)
        if (sidebar) {
            setClass(sidebar, sidebarClass, !!empty)
            sidebarTargets.add(sidebar)
        }
        const showSidebar = sidebar && !empty && window.getComputedStyle(sidebar).display !== 'none'
        if (centered && (centered.element !== column || column.style.getPropertyValue('transform') !== centered.applied)) restoreCenter()
        if (!column || !options.center_primary_column || window.innerWidth < 1000 || showSidebar) restoreCenter()
        else {
            if (!centered) centered = { element: column, original: column.style.getPropertyValue('transform'), priority: column.style.getPropertyPriority('transform'), offset: 0, applied: null }
            // Account for our previous translation instead of clearing it and forcing two layouts.
            const rect = column.getBoundingClientRect()
            const offset = (window.innerWidth - rect.width) / 2 - rect.left + centered.offset
            const applied = `translateX(${offset}px)${centered.original ? ` ${centered.original}` : ''}`
            if (centered.applied !== applied) column.style.setProperty('transform', applied, 'important')
            centered.offset = offset
            centered.applied = applied
        }
        if (resizeObserver) {
            const elements = [column, column?.parentElement, sidebar].filter(Boolean)
            if (elements.length !== observedLayout.length || elements.some((element, index) => element !== observedLayout[index])) {
                resizeObserver.disconnect()
                observedLayout = elements
                elements.forEach(element => resizeObserver.observe(element))
            }
        }
    }

    function addRoot(element) {
        if (!element?.isConnected) return
        const boundary = element.closest("[data-testid='cellInnerDiv'], [data-testid='sidebarColumn'], header, nav, [data-testid='BottomBar'], [data-testid='primaryColumn']") || element
        for (const existing of roots) if (existing.contains(boundary)) return
        for (const existing of roots) if (boundary.contains(existing)) roots.delete(existing)
        roots.add(boundary)
    }

    function mutations(records) {
        let changed = false
        for (const record of records) {
            const target = record.target.nodeType === 1 ? record.target : record.target.parentElement
            if (!target || target.closest('script, style, [data-stash-layout-diagnostic]')) continue
            const nodes = record.type === 'childList' ? [...record.addedNodes, ...record.removedNodes] : []
            if (nodes.length && nodes.every(node => node.nodeType === 1 && node.matches('script, style, [data-stash-layout-diagnostic]'))) continue
            changed = domDirty = true
            if (barNodes.some(bar => target.contains(bar) || bar.contains(target)) || target.closest("[data-testid='BottomBar']")) barsDirty = true
            if (record.type === 'childList') {
                for (const node of nodes) {
                    if (node.nodeType === 1 && (node.matches("[data-testid='BottomBar']") || node.querySelector("[data-testid='BottomBar']"))) barsDirty = true
                }
            }
            if (target === document.body || target === document.documentElement) {
                const added = Array.from(record.addedNodes || []).filter(node => node.nodeType === 1 && !node.matches('script, style, [data-stash-layout-diagnostic]'))
                added.forEach(addRoot)
                if (record.type === 'attributes') layoutDirty = true
            } else addRoot(target)
            if (nodes.some(node => node.nodeType === 1 && (node.matches("header, [data-testid='primaryColumn'], [data-testid='sidebarColumn']") || node.querySelector("header, [data-testid='primaryColumn'], [data-testid='sidebarColumn']")))) layoutDirty = true
            // Timeline text updates do not change horizontal layout. Header/sidebar,
            // structural changes and external styles can change available column space.
            if (target.closest("header, [data-testid='sidebarColumn']") || target === column || record.type === 'attributes' && ['style', 'class'].includes(record.attributeName) || !column?.isConnected) layoutDirty = true
        }
        if (changed) schedule()
    }

    const observer = needsUpdates ? new MutationObserver(mutations) : null
    const observedWidths = new WeakMap()
    const resizeObserver = needsUpdates && (options.center_primary_column || options.hide_top_nav) ? new ResizeObserver(entries => {
        let widthChanged = false
        entries.forEach(entry => {
            if (observedWidths.get(entry.target) !== entry.contentRect.width) widthChanged = true
            observedWidths.set(entry.target, entry.contentRect.width)
        })
        if (widthChanged) { layoutDirty = true; schedule() }
    }) : null
    function observe() {
        observer?.observe(document.documentElement, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['class', 'style', 'href', 'aria-label', 'role', 'data-testid'] })
    }

    function schedule() {
        if (destroyed || paused || document.visibilityState === 'hidden' || frame !== null || !needsUpdates) return
        frame = window.requestAnimationFrame(flush)
    }

    function flush() {
        frame = null
        if (destroyed || paused || document.visibilityState === 'hidden') return
        mutationsPending()
        observer?.disconnect()
        try {
            const nextPath = new URL(window.location.href).pathname
            if (nextPath !== path) {
                path = nextPath
                fullUpdate = layoutDirty = barsDirty = true
                scrollState = { lastY: currentScrollY(), distance: 0, direction: 0, collapsed: false }
            }
            if (fullUpdate || domDirty || roots.size) reconcile(fullUpdate ? [document] : Array.from(roots))
            if (fullUpdate || layoutDirty) updateLayout()
            if (autoHideBottomBar && (fullUpdate || barsDirty)) refreshBars()
            if (autoHideBottomBar && scrollDirty) {
                const max = maxScrollY()
                // Shrinking content can clamp the window's position without a user
                // gesture. Do not interpret that clamp as an upward scroll.
                const previous = scrollState.lastY > max ? { ...scrollState, lastY: max, distance: 0 } : scrollState
                const next = nextScrollState(previous, currentScrollY())
                const changed = next.collapsed !== scrollState.collapsed
                scrollState = next
                if (changed) renderBars()
            }
            fullUpdate = layoutDirty = barsDirty = scrollDirty = domDirty = false
            roots.clear()
        } finally { observe() }
    }

    function mutationsPending() {
        const records = observer?.takeRecords()
        if (records?.length) mutations(records)
        // mutations() may schedule another frame. This flush already includes its work.
        if (frame !== null) window.cancelAnimationFrame(frame)
        frame = null
    }

    function listen(target, type, callback, settings) {
        target.addEventListener(type, callback, settings)
        listeners.push(() => target.removeEventListener(type, callback, settings))
    }

    function syncTopNavPolicy() {
        if (options.hide_top_nav) setClass(document.documentElement, 'x-ad-hide-top-nav', !new URL(window.location.href).pathname.startsWith('/explore'))
    }

    function refresh() {
        if (destroyed) return
        syncTopNavPolicy()
        fullUpdate = layoutDirty = barsDirty = true
        schedule()
    }

    function pause() {
        paused = true
        if (frame !== null) window.cancelAnimationFrame(frame)
        frame = null
        observer?.disconnect()
        resizeObserver?.disconnect()
        observedLayout = []
    }

    function resume() {
        if (destroyed || document.visibilityState === 'hidden') return
        paused = false
        if (frame !== null) window.cancelAnimationFrame(frame)
        frame = null
        syncTopNavPolicy()
        scrollState = { lastY: currentScrollY(), distance: 0, direction: 0, collapsed: false }
        fullUpdate = layoutDirty = barsDirty = true
        // Foreground rAF delivery can lag behind lifecycle events. Reconcile and
        // reconnect observers now; don't wait for scrolling to wake the page.
        flush()
    }

    function destroy() {
        if (destroyed) return
        destroyed = true
        resetTaps()
        if (frame !== null) window.cancelAnimationFrame(frame)
        observer?.disconnect()
        resizeObserver?.disconnect()
        listeners.forEach(remove => remove())
        historyHooks.forEach(([key, original, wrapper]) => { if (window.history[key] === wrapper) window.history[key] = original })
        managed.forEach((_, element) => setClass(element, hiddenClass, false))
        sidebarTargets.forEach(element => setClass(element, sidebarClass, false))
        bottomBarTargets.forEach(element => element.classList.remove('x-ad-bottom-bar-autohide', 'x-ad-bottom-bar-collapsed'))
        restoreCenter()
        setClass(document.documentElement, 'x-ad-home-layout', previousHomeClass)
        if (options.hide_top_nav) setClass(document.documentElement, 'x-ad-hide-top-nav', previousTopNavClass)
        style.remove()
        managed.clear()
        sidebarTargets.clear()
        bottomBarTargets.clear()
        roots.clear()
        if (window.__stashXBlocker?.destroy === destroy) delete window.__stashXBlocker
    }

    window.__stashXBlocker = { refresh, destroy }
    if (options.enable_escape_back) listen(document, 'keydown', event => {
        if (event.key !== 'Escape' || event.isComposing || event.repeat || !detailPattern.test(new URL(window.location.href).pathname)) return
        if (window.__stashXVideos?.isOpen()) return
        if (event.target instanceof Element && event.target.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"])')) return
        event.preventDefault()
        event.stopPropagation()
        window.history.back()
    }, true)
    if (options.enable_double_tap_back) {
        listen(document, 'touchstart', event => {
            lastTouchAt = event.timeStamp
            const region = !event.defaultPrevented && event.touches.length === 1 && backRegion(event.target)
            if (!region) { resetTaps(); return }
            const point = event.touches[0]
            touch = { id: point.identifier, x: point.clientX, y: point.clientY, at: event.timeStamp, href: window.location.href, region }
        }, { capture: true, passive: true })
        listen(document, 'touchmove', event => {
            if (!touch) return
            const point = Array.from(event.touches).find(item => item.identifier === touch.id)
            if (event.touches.length !== 1 || !point || Math.hypot(point.clientX - touch.x, point.clientY - touch.y) > 10) resetTaps()
        }, { capture: true, passive: true })
        listen(document, 'touchend', event => {
            lastTouchAt = event.timeStamp
            const started = touch
            touch = null
            const point = started && Array.from(event.changedTouches).find(item => item.identifier === started.id)
            if (!started || !point || event.defaultPrevented || event.touches.length || event.timeStamp - started.at > 250 ||
                Math.hypot(point.clientX - started.x, point.clientY - started.y) > 10 || started.href !== window.location.href ||
                backRegion(event.target) !== started.region) { resetTaps(); return }
            const previous = firstTap
            firstTap = { ...started, x: point.clientX, y: point.clientY, at: event.timeStamp }
            if (previous && previous.href === started.href && previous.region === started.region &&
                started.at - previous.at <= 300 && Math.hypot(point.clientX - previous.x, point.clientY - previous.y) <= 24) gestureBack(event)
        }, { capture: true, passive: false })
        listen(document, 'touchcancel', resetTaps, { capture: true, passive: true })
        listen(document, 'scroll', resetTaps, { capture: true, passive: true })
        listen(document, 'dblclick', event => {
            if (event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.altKey || event.shiftKey ||
                event.timeStamp - lastTouchAt < 800 || !backRegion(event.target)) return
            gestureBack(event)
        }, true)
        listen(window, 'pagehide', resetTaps)
        listen(window, 'pageshow', resetTaps)
        listen(document, 'visibilitychange', resetTaps)
    }
    if (needsUpdates) {
        syncTopNavPolicy()
        document.head.appendChild(style)
        flush()
        listen(window, 'resize', refresh)
        listen(window.visualViewport || window, 'resize', () => { layoutDirty = barsDirty = true; schedule() })
        if (autoHideBottomBar) listen(window, 'scroll', () => { scrollDirty = true; schedule() }, { passive: true })
        listen(window, 'pageshow', resume)
        listen(window, 'focus', resume)
        listen(window, 'pagehide', pause)
        listen(document, 'visibilitychange', () => {
            if (document.visibilityState === 'hidden') pause()
            else resume()
        })
    }
    if (needsUpdates || options.enable_double_tap_back) {
        listen(window, 'popstate', () => { resetTaps(); if (needsUpdates) refresh() })
        for (const key of ['pushState', 'replaceState']) {
            const original = window.history[key]
            if (typeof original !== 'function') continue
            const wrapper = function (...args) {
                const previousPath = new URL(window.location.href).pathname
                const result = original.apply(this, args)
                resetTaps()
                if (needsUpdates && new URL(window.location.href).pathname !== previousPath) refresh()
                return result
            }
            window.history[key] = wrapper
            historyHooks.push([key, original, wrapper])
        }
    }
}

// Injected in <head> before X starts requests; no Stash globals or page internals.
function startVideoTools(options) {
    window.__stashXVideos?.destroy()
    const marker = '[data-stash-x-video]'
    const playerSelector = 'video, [data-testid="videoPlayer"], [data-testid="previewInterstitial"]'
    const posts = new Map()
    const entries = new Map()
    const scripts = new WeakMap()
    const cleanups = []
    const controllers = new Set()
    const objectURLs = new Set()
    const timers = new Set()
    const shareDownloads = new Map()
    let downloadNotice = null
    let savePrompt = null
    const originalFetch = window.fetch
    const originalOpen = XMLHttpRequest.prototype.open
    const originalSend = XMLHttpRequest.prototype.send
    const xhrURLs = new WeakMap()
    const maxBytes = 64 * 1024 * 1024
    let destroyed = false
    let frame = null
    let panel = null
    let route = location.pathname
    let focusBefore = null
    let keyboardFocus = true
    let activePost = null
    let loading = false
    let metadataController = null
    const menuSelector = '[role="menu"], [data-testid="Dropdown"], [data-testid="sheetDialog"], [role="dialog"]'
    let shareContext = null
    let shareRow = null
    const shareDiagnostics = { enabled: options.enable_share_menu_download, trigger: false, menu: false, action: null }

    // iPhone X can render only a poster and play button until playback starts.
    // Require the play control so unrelated interstitials are not treated as video.
    function players(scope) {
        return Array.from(scope.querySelectorAll(playerSelector)).filter(player =>
            !player.matches('[data-testid="previewInterstitial"]') || player.querySelector('[data-testid="playButton"]'))
    }

    /* Lucide v0.468.0 (ISC), Copyright (c) Lucide Contributors.
     * Permission to use, copy, modify, and/or distribute this software for any
     * purpose with or without fee is hereby granted, provided that the above
     * copyright notice and this permission notice appear in all copies.
     * THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
     * WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
     * MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
     * ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
     * WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
     * ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
     * OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
     * https://lucide.dev/license
     */
    const icons = {
        download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/>',
        copy: '<rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
        open: '<path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',
        close: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
        retry: '<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/>',
        share: '<path d="M12 16V3"/><path d="m7 8 5-5 5 5"/><path d="M20 16v4a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-4"/>',
    }
    const css = `
        :host { color-scheme:light dark; font:14px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC",sans-serif; color:light-dark(#0f1419,#e7e9ea); letter-spacing:0; }
        * { box-sizing:border-box; letter-spacing:0; }
        button,a,select,input,summary { font:inherit; touch-action:manipulation; }
        button,a { min-height:44px; display:inline-flex; align-items:center; justify-content:center; gap:8px; border:1px solid light-dark(#cfd9de,#536471); border-radius:6px; padding:8px 12px; background:transparent; color:inherit; cursor:pointer; text-decoration:none; }
        button:disabled { opacity:.5; cursor:wait; }
        button:focus-visible,a:focus-visible,select:focus-visible,input:focus-visible,summary:focus-visible { outline:2px solid #1d9bf0; outline-offset:2px; }
        svg { width:19px; height:19px; flex:none; }
        .entry { border:0; padding:4px 8px; color:light-dark(#536471,#8b98a5); }
        .icon { width:44px; padding:8px; border:0; flex:none; }
        dialog { color:inherit; background:light-dark(#fff,#15202b); width:min(480px,calc(100% - 24px)); max-height:calc(100dvh - 32px); padding:0; border:1px solid light-dark(#cfd9de,#536471); border-radius:8px; overscroll-behavior:contain; }
        dialog::backdrop { background:rgb(0 0 0 / .45); }
        header { display:flex; align-items:center; justify-content:space-between; padding:12px 16px; border-bottom:1px solid light-dark(#eff3f4,#38444d); }
        h2 { margin:0; font-size:18px; font-weight:700; }
        .body { padding:16px; display:grid; gap:16px; }
        .media { display:flex; align-items:center; gap:12px; }
        img { width:56px; height:56px; object-fit:cover; border-radius:4px; }
        .fields { display:grid; gap:6px; flex:1; min-width:0; }
        label { display:grid; gap:6px; min-width:0; }
        select,input { width:100%; min-width:0; height:44px; min-height:44px; color:inherit; background:light-dark(#fff,#15202b); border:1px solid light-dark(#cfd9de,#536471); border-radius:4px; padding:8px; font-size:16px; }
        .actions { display:flex; flex-wrap:wrap; gap:8px; }
        .primary { background:#1d9bf0; border-color:#1d9bf0; color:#fff; }
        .status { margin:0; min-height:21px; overflow-wrap:anywhere; color:light-dark(#536471,#8b98a5); }
        summary { cursor:pointer; min-height:44px; display:flex; align-items:center; }
        pre { white-space:pre-wrap; overflow-wrap:anywhere; font:12px/1.6 ui-monospace,monospace; max-height:240px; overflow:auto; }
        [hidden] { display:none !important; }
        @media (max-width:600px) { dialog { margin:auto 0 0; width:100%; max-width:none; max-height:85dvh; padding-bottom:env(safe-area-inset-bottom); border-radius:8px 8px 0 0; } }
        @media (hover:hover) { button:hover,a:hover { background:light-dark(#eff3f4,#273340); } .primary:hover { background:#1a8cd8; } }
    `

    function element(tag, text) {
        const node = document.createElement(tag)
        if (text) node.textContent = text
        return node
    }

    function iconButton(name, label, tag = 'button') {
        const node = element(tag)
        if (tag === 'button') node.type = 'button'
        node.title = label
        node.setAttribute('aria-label', label)
        // Only static, vendored icon markup enters innerHTML.
        node.innerHTML = `<svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${icons[name]}</svg>`
        node.appendChild(element('span', label))
        return node
    }

    function shadowHost() {
        const host = element('div')
        host.setAttribute('data-stash-x-video', '')
        const root = host.attachShadow({ mode: 'open' })
        const style = element('style', css)
        root.appendChild(style)
        return { host, root }
    }

    function postId(url) {
        if (typeof url !== 'string') return null
        try {
            const parsed = new URL(url, location.href)
            return /^(?:(?:www|m|mobile)\.)?(?:x|twitter)\.com$/.test(parsed.hostname) || parsed.origin === location.origin
                ? parsed.pathname.match(/\/(?:[^/]+\/status|i\/web\/status)\/(\d+)(?:\/|$)/)?.[1] || null : null
        } catch (_) { return null }
    }

    function mediaURL(url) {
        try {
            const parsed = new URL(url)
            return parsed.protocol === 'https:' && parsed.hostname === 'video.twimg.com' ? parsed.href : null
        } catch (_) { return null }
    }

    function ingest(data, source) {
        const stack = [[data, null]]
        const seen = new WeakSet()
        let changed = false
        let budget = 50000
        while (stack.length && budget-- > 0) {
            const [value, inherited] = stack.pop()
            if (!value || typeof value !== 'object' || seen.has(value)) continue
            seen.add(value)
            const tweet = value.__typename === 'Tweet' || value.media_entities2 || value.extended_entities || value.mediaDetails || value.legacy
            const candidate = value.rest_id || value.id_str || value.legacy?.id_str
            const id = tweet && typeof candidate === 'string' && /^\d+$/.test(candidate) ? candidate : inherited
            const owner = postId(value.expanded_url) || (typeof value.source_status_id_str === 'string' ? value.source_status_id_str : id)
            if (owner && value.video_info?.variants && ['video', 'animated_gif'].includes(value.type)) {
                const variants = value.video_info.variants.map(variant => ({
                    url: mediaURL(variant.url), type: variant.content_type, bitrate: Number(variant.bitrate) || 0,
                })).filter(variant => variant.url && ['video/mp4', 'application/x-mpegURL'].includes(variant.type))
                const mp4 = variants.filter(variant => variant.type === 'video/mp4').sort((a, b) => b.bitrate - a.bitrate)
                const variantId = variants.map(variant => new URL(variant.url).pathname.match(/^\/(?:amplify_video|ext_tw_video)\/(\d+)\//)?.[1]).find(Boolean)
                const key = String(value.id_str || value.media_key || variantId || value.media_url_https || mp4[0]?.url || '')
                if (variants.length && key) {
                    const record = { id: key, post: owner, poster: value.media_url_https || '', duration: value.video_info.duration_millis || 0, allowDownload: value.allow_download_status?.allow_download ?? value.additional_media_info?.downloadable ?? null, mp4, hls: variants.find(variant => variant.type === 'application/x-mpegURL')?.url || null, source }
                    if (!posts.has(owner)) posts.set(owner, new Map())
                    const previous = posts.get(owner).get(key)
                    if (JSON.stringify(previous) !== JSON.stringify(record)) {
                        posts.get(owner).set(key, record)
                        changed = true
                    }
                }
            }
            for (const child of Object.values(value)) if (child && typeof child === 'object') stack.push([child, id])
        }
        while (posts.size > 200) {
            const oldest = posts.keys().next().value
            if (oldest === activePost) { const saved = posts.get(oldest); posts.delete(oldest); posts.set(oldest, saved) }
            else posts.delete(oldest)
        }
        if (changed) {
            schedule()
            if (panel?.dialog.open && activePost && !panel.media.options.length) renderMedia()
        }
    }

    function readScript(script) {
        const text = script.textContent || ''
        if (!text.includes('video_info') || scripts.get(script) === text.length || text.length > 4 * 1024 * 1024) return
        scripts.set(script, text.length)
        try { ingest(JSON.parse(text), '页面数据'); return } catch (_) { /* Serialized hydration may wrap JSON in JavaScript. */ }
        const first = text.indexOf('{'), last = text.lastIndexOf('}')
        try { ingest(JSON.parse(text.slice(first, last + 1)), '页面数据'); return } catch (_) { /* Read string literals without executing page code. */ }
        for (const match of text.matchAll(/"(?:[^"\\]|\\.)*"/g)) {
            if (!match[0].includes('video_info')) continue
            try {
                const decoded = JSON.parse(match[0])
                if (typeof decoded === 'string' && decoded.trim().startsWith('{')) ingest(JSON.parse(decoded), '页面数据')
            } catch (_) { /* An unrelated string is not a JSON payload. */ }
        }
    }

    function apiRequest(url) {
        try {
            const parsed = new URL(url, location.href)
            return parsed.origin === location.origin && /^\/i\/api\/(?:graphql|2)\//.test(parsed.pathname)
        } catch (_) { return false }
    }

    const wrappedFetch = function (...args) {
        const result = originalFetch.apply(this, args)
        const url = typeof args[0] === 'string' || args[0] instanceof URL ? String(args[0]) : args[0]?.url
        if (apiRequest(url)) result.then(response => {
            if (destroyed || !response.ok) return
            response.clone().json().then(data => { if (!destroyed) ingest(data, '接口响应') }).catch(() => {})
        }).catch(() => {})
        return result
    }
    const wrappedOpen = function (method, url, ...args) {
        const result = originalOpen.call(this, method, url, ...args)
        xhrURLs.set(this, url)
        return result
    }
    const wrappedSend = function (...args) {
        if (!apiRequest(xhrURLs.get(this))) return originalSend.apply(this, args)
        const loaded = () => {
            cleanups.splice(cleanups.indexOf(remove), 1)
            if (destroyed || this.status < 200 || this.status >= 300) return
            try { ingest(this.responseType === 'json' ? this.response : JSON.parse(this.responseText), '接口响应') } catch (_) { /* Non-JSON or aborted response. */ }
        }
        const remove = () => this.removeEventListener('loadend', loaded)
        this.addEventListener('loadend', loaded, { once: true })
        cleanups.push(remove)
        try { return originalSend.apply(this, args) } catch (error) { remove(); cleanups.splice(cleanups.indexOf(remove), 1); throw error }
    }
    window.fetch = wrappedFetch
    XMLHttpRequest.prototype.open = wrappedOpen
    XMLHttpRequest.prototype.send = wrappedSend

    function listen(target, type, handler, options) {
        target.addEventListener(type, handler, options)
        cleanups.push(() => target.removeEventListener(type, handler, options))
    }

    listen(document, 'keydown', () => { keyboardFocus = true }, true)
    listen(document, 'pointerdown', () => { keyboardFocus = false }, true)
    listen(document, 'touchstart', () => { keyboardFocus = false }, { capture: true, passive: true })

    function identify(scope) {
        const direct = postId(scope.getAttribute('href'))
        if (direct) return direct
        const links = Array.from(scope.querySelectorAll('a[href]')).filter(link => {
            const quote = link.parentElement.closest('[data-testid="quoteTweet"], [role="link"]')
            return (!quote || quote === scope || !scope.contains(quote)) && (scope.tagName !== 'ARTICLE' || link.closest('article') === scope)
        })
        for (const link of links.filter(link => link.querySelector('time'))) { const id = postId(link.href); if (id) return id }
        for (const link of links.filter(link => /\/status\/\d+\/(?:video|photo)\//.test(link.getAttribute('href')))) { const id = postId(link.href); if (id) return id }
        // New X SSR uses ordinary spans for timestamps. Only accept an
        // unambiguous own permalink, excluding nested tweets and quote cards.
        const candidates = new Set(links.map(link => postId(link.href)).filter(Boolean))
        return candidates.size === 1 ? candidates.values().next().value : null
    }

    function clearShareRow() {
        if (!shareRow) return
        shareRow.button.remove()
        if (shareRow.original) {
            if (shareRow.style === null) shareRow.original.removeAttribute('style')
            else shareRow.original.setAttribute('style', shareRow.style)
        }
        shareRow = null
    }

    function validShareContext() {
        return shareContext && shareContext.path === location.pathname && shareContext.scope.isConnected && identify(shareContext.scope) === shareContext.id
    }

    function visibleMenu(menu) {
        return !menu.closest(marker) && menu.getClientRects().length > 0 && getComputedStyle(menu).visibility !== 'hidden'
    }

    function nativeDownload(item) {
        if (item.matches(marker)) return false
        if (/^(?:downloadVideo|download-video|videoDownload)$/i.test(item.getAttribute('data-testid') || '')) return true
        return [item.getAttribute('aria-label'), item.textContent, ...Array.from(item.querySelectorAll('span')).map(node => node.textContent)]
            .some(text => /^(?:下载视频|下載影片|下載視頻|download video)(?:\s|$)/i.test((text || '').trim()))
    }

    function shareMenu(menu) {
        return Array.from(menu.querySelectorAll('[role="menuitem"], button, [role="button"], a[href]')).some(item => nativeDownload(item) ||
            /^(?:copyLink|copy-link)$/i.test(item.getAttribute('data-testid') || '') ||
            /^(?:copy link(?: to (?:post|tweet))?|复制链接|複製連結|复制帖子链接|複製貼文連結)$/i.test((item.getAttribute('aria-label') || item.textContent || '').trim()))
    }

    function activateShare(context) {
        if (shareContext !== context || context.activating || shareDownloads.has(context.id) || !validShareContext()) return
        context.activating = true
        downloadSharedPost(context)
        const menu = context.menu
        const cancel = Array.from(menu.querySelectorAll('button, [role="button"], [role="menuitem"]')).find(item =>
            !item.closest(marker) && item.getClientRects().length &&
            /^(?:取消|cancel)$/i.test((item.getAttribute('aria-label') || item.textContent || '').trim()))
        const mask = menu.querySelector('[data-testid="mask"]')
        shareDiagnostics.dismissal = cancel ? 'cancel' : mask ? 'mask' : 'escape'
        // Mobile sheets manage their own focus and may ignore synthetic Escape.
        // Use their dismissal action while the MP4 downloads independently.
        if (cancel) cancel.click()
        else if (mask) mask.click()
        else menu.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', keyCode: 27, bubbles: true, cancelable: true }))
        const deadline = performance.now() + 1000
        const finish = () => {
            if (destroyed || shareContext !== context || !validShareContext()) return
            const closed = !menu.isConnected || !visibleMenu(menu)
            if (!closed && performance.now() < deadline) {
                const timer = setTimeout(() => { timers.delete(timer); finish() }, 32)
                timers.add(timer)
                return
            }
            context.activating = false
            shareDiagnostics.dismissed = closed
            // If dismissal was refused, retain the replacement rather than
            // exposing the original subscription action on the next tap.
            if (closed) { clearShareRow(); shareContext = null }
        }
        const timer = setTimeout(() => { timers.delete(timer); finish() }, 0)
        timers.add(timer)
    }

    function syncShareMenu() {
        if (!options.enable_share_menu_download) return
        if (!validShareContext()) { clearShareRow(); shareContext = null; return }
        if (shareContext.activating) return
        if (shareContext.menu && (!shareContext.menu.isConnected || !visibleMenu(shareContext.menu))) { clearShareRow(); shareContext = null; return }
        if (!shareContext.menu) {
            shareContext.menu = Array.from(document.querySelectorAll(menuSelector)).find(menu =>
                !shareContext.before.has(menu) && visibleMenu(menu) && shareMenu(menu))
        }
        const menu = shareContext.menu
        if (!menu) return
        shareDiagnostics.menu = true
        // Do not replace an author's explicit no-download setting with this experiment.
        if (Array.from(posts.get(shareContext.id)?.values() || []).some(record => record.allowDownload === false)) { clearShareRow(); shareDiagnostics.action = 'author-disabled'; return }
        const original = Array.from(menu.querySelectorAll('[role="menuitem"], button, [role="button"], a[href]')).find(nativeDownload)
        if (shareRow?.button.isConnected && shareRow.original === (original || null)) return
        clearShareRow()
        shareDiagnostics.action = original ? 'replaced' : 'added'
        const peers = Array.from(menu.querySelectorAll('[role="menuitem"], button, [role="button"], a[href]')).filter(item =>
            item !== original && !item.closest(marker) && !nativeDownload(item) && !item.disabled && item.getAttribute('aria-disabled') !== 'true' && item.getClientRects().length)
        const peer = peers[0]
        const label = peer && Array.from(peer.querySelectorAll('span')).find(span => !span.children.length && span.textContent.trim())
        const color = getComputedStyle(label || peer || menu).color
        const button = original ? original.cloneNode(true) : iconButton('download', '下载视频')
        // Preserve the native row's icon, spacing and typography. Its label can
        // have its own disabled color, independent of the menu container.
        for (const node of [button, ...button.querySelectorAll('*')]) {
            for (const attribute of Array.from(node.attributes)) {
                if (/^on/i.test(attribute.name) || ['id', 'href', 'disabled', 'aria-disabled'].includes(attribute.name)) node.removeAttribute(attribute.name)
            }
            node.style.setProperty('color', color, 'important')
            node.style.setProperty('opacity', '1', 'important')
        }
        button.style.setProperty('pointer-events', 'auto', 'important')
        button.setAttribute('role', 'menuitem')
        button.setAttribute('aria-label', '下载视频')
        button.tabIndex = 0
        button.setAttribute('data-stash-x-video', 'share-download')
        if (!original) {
            button.style.cssText += ';display:flex;align-items:center;gap:12px;width:100%;min-height:44px;padding:12px 16px;border:0;border-radius:0;background:transparent;font:inherit;text-align:start;cursor:pointer;box-sizing:border-box'
            button.querySelector('svg').style.cssText = 'width:20px;height:20px;flex:none'
        }
        const context = shareContext
        // Keep the sheet's press responders from selecting a native item for
        // this injected control. Defaults remain available for touch scrolling.
        for (const type of ['pointerdown', 'pointerup', 'mousedown', 'mouseup', 'touchstart', 'touchend']) {
            button.addEventListener(type, event => event.stopPropagation())
        }
        button.addEventListener('click', event => {
            event.preventDefault()
            event.stopPropagation()
            activateShare(context)
        })
        if (button.tagName !== 'BUTTON') button.addEventListener('keydown', event => {
            if (!['Enter', ' '].includes(event.key)) return
            event.preventDefault()
            event.stopPropagation()
            activateShare(context)
        })
        shareRow = { button, original: original || null, style: original?.getAttribute('style') ?? null }
        if (original) {
            original.style.setProperty('display', 'none', 'important')
            original.after(button)
        } else {
            const container = menu.querySelector('[role="menuitem"]')?.parentElement || menu
            container.appendChild(button)
        }
    }

    function shareTrigger(trigger) {
        if (!trigger) return false
        const label = trigger.getAttribute('aria-label') || ''
        if (/^(?:share|shareButton|share-button|tweetShare)$/i.test(trigger.getAttribute('data-testid') || '') || /^(?:share(?: post| tweet)?|分享(?:帖子|推文)?|共享(?:帖子|推文)?|分享貼文|分享推文)$/i.test(label.trim())) return true
        // The mobile action row may expose only X's upload/share icon.
        // Limit the icon fallback to a tweet's own reply/like action group.
        const scope = trigger.closest('article')
        const group = trigger.closest('[role="group"]')
        return !!scope && group?.closest('article') === scope &&
            group.querySelector('[data-testid="reply"]')?.closest('article') === scope &&
            group.querySelector('[data-testid="like"]')?.closest('article') === scope &&
            Array.from(trigger.querySelectorAll('svg path')).some(path => (path.getAttribute('d') || '').startsWith('M12 2.59l5.7 5.7-1.41 1.42L13 6.41V16h-2V6.41'))
    }

    function trackShare(event) {
        const target = event.target instanceof Element ? event.target : event.target?.parentElement
        if (!target || target.closest(`${marker}, [data-stash-layout-diagnostic]`)) return
        const trigger = target.closest('button, [role="button"]')
        const share = shareTrigger(trigger)
        const scope = share ? trigger.closest('article') : null
        const id = scope && identify(scope)
        if (trigger?.closest('article')) Object.assign(shareDiagnostics, { lastEvent: event.type, lastAttempt: !share ? 'unrecognized-trigger' : !id ? 'unidentified-post' : 'no-own-video' })
        if (id && (posts.has(id) || players(scope).some(player => player.closest('article') === scope && !player.closest('[data-testid="quoteTweet"], [role="link"]')))) {
            // A touch may open the menu before its compatibility click. Keep
            // the original pre-menu snapshot through that same activation.
            if (validShareContext() && shareContext.trigger === trigger && (!shareContext.menu || (shareContext.menu.isConnected && visibleMenu(shareContext.menu)))) {
                shareDiagnostics.lastAttempt = 'recognized'
                schedule()
                return
            }
            clearShareRow()
            Object.assign(shareDiagnostics, { trigger: true, menu: false, action: null, dismissal: null, dismissed: null, download: null, lastAttempt: 'recognized' })
            shareContext = { id, scope, trigger, path: location.pathname, before: new Set(Array.from(document.querySelectorAll(menuSelector)).filter(visibleMenu)), menu: null }
            schedule()
        } else if (!shareContext?.menu?.contains(target)) {
            clearShareRow()
            shareContext = null
        }
    }

    if (options.enable_share_menu_download) {
        listen(document, 'pointerdown', trackShare, true)
        listen(document, 'touchstart', trackShare, { capture: true, passive: true })
        listen(document, 'click', trackShare, true)
        const cancelShare = event => {
            if (!shareContext?.menu && shareContext?.trigger.contains(event.target)) {
                shareContext = null
                shareDiagnostics.lastAttempt = 'cancelled'
            }
        }
        listen(document, 'pointercancel', cancelShare, true)
        listen(document, 'touchcancel', cancelShare, true)
    }

    function scan() {
        frame = null
        if (destroyed || !document.body) return
        if (route !== location.pathname) { route = location.pathname; closePanel(); clearSavePrompt() }
        observer.disconnect()
        try {
            if (panel && !panel.host.isConnected) {
                const wasOpen = panel.dialog.open
                document.body.appendChild(panel.host)
                if (wasOpen) { panel.dialog.close(); panel.dialog.showModal() }
            }
            for (const [scope, entry] of entries) {
                if (!scope.isConnected || !entry.host.isConnected || identify(scope) !== entry.post || !players(scope).length) {
                    entry.host.remove()
                    entries.delete(scope)
                }
            }
            if (options.enable_video_tools) players(document).forEach(player => {
                if (player.closest(marker)) return
                const quote = player.closest('[data-testid="quoteTweet"], [role="link"]')
                const scope = quote && identify(quote) ? quote : player.closest('article')
                if (!scope || scope.closest(marker)) return
                const id = identify(scope)
                if (!id || entries.has(scope)) return
                const { host, root } = shadowHost()
                const button = iconButton('download', '视频文件')
                button.className = 'entry'
                button.addEventListener('click', event => {
                    event.preventDefault()
                    event.stopPropagation()
                    if (identify(scope) === id) openPanel(id, button)
                    else schedule()
                })
                // X's delegated click handlers must not treat this as a tweet tap.
                host.addEventListener('click', event => event.stopPropagation())
                root.appendChild(button)
                let mount = player.closest('[data-testid="videoPlayer"]') || player
                // Keep the entry outside fixed-aspect media frames and overlays.
                // Both old videoPlayer wrappers and new SSR players clip children.
                for (let parent = mount.parentElement; parent && parent !== scope; parent = mount.parentElement) {
                    const computed = getComputedStyle(parent)
                    if (parent.children.length !== 1 && computed.aspectRatio === 'auto' && !['hidden', 'clip'].includes(computed.overflow)) break
                    mount = parent
                }
                mount.insertAdjacentElement('afterend', host)
                entries.set(scope, { host, post: id })
            })
            syncShareMenu()
        } finally { observe() }
    }

    function schedule() {
        if (!destroyed && frame === null && document.visibilityState !== 'hidden') frame = requestAnimationFrame(scan)
    }

    function makePanel() {
        const { host, root } = shadowHost()
        const dialog = element('dialog')
        dialog.setAttribute('aria-label', '视频文件')
        const header = element('header')
        header.appendChild(element('h2', '视频文件'))
        const close = iconButton('close', '关闭')
        close.className = 'icon'
        close.querySelector('span').hidden = true
        close.onclick = closePanel
        header.appendChild(close)
        const body = element('div')
        body.className = 'body'
        const mediaRow = element('div')
        mediaRow.className = 'media'
        const poster = element('img')
        poster.alt = '视频封面'
        const fields = element('div')
        fields.className = 'fields'
        const media = element('select')
        media.setAttribute('aria-label', '视频')
        const quality = element('select')
        quality.setAttribute('aria-label', '画质')
        fields.append(media, quality)
        mediaRow.append(poster, fields)
        const actions = element('div')
        actions.className = 'actions'
        const open = iconButton('open', '打开原文件', 'a')
        open.target = '_blank'
        open.rel = 'noopener noreferrer'
        open.className = 'primary'
        const copy = iconButton('copy', '复制地址')
        const save = iconButton('download', '保存视频')
        actions.append(open, copy, save)
        const addressLabel = element('label', 'MP4 地址')
        const address = element('input')
        address.readOnly = true
        address.setAttribute('aria-label', 'MP4 地址')
        address.onclick = () => address.select()
        addressLabel.appendChild(address)
        const status = element('p')
        status.className = 'status'
        status.setAttribute('role', 'status')
        const retry = iconButton('retry', '重新读取')
        const details = element('details')
        details.appendChild(element('summary', '调试信息'))
        const debug = element('pre')
        const copyDebug = iconButton('copy', '复制调试信息')
        details.append(debug, copyDebug)
        body.append(mediaRow, actions, addressLabel, status, retry, details)
        dialog.append(header, body)
        root.appendChild(dialog)
        document.body.appendChild(host)
        panel = { host, root, dialog, media, quality, poster, actions, addressLabel, address, status, retry, debug, copy, save, open }
        dialog.addEventListener('cancel', event => { event.preventDefault(); closePanel() })
        dialog.addEventListener('click', event => {
            if (event.target !== dialog) return
            const rect = dialog.getBoundingClientRect()
            if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) closePanel()
        })
        root.addEventListener('keydown', event => { if (event.key === 'Escape') { event.stopPropagation(); event.preventDefault(); closePanel() } })
        root.addEventListener('click', event => event.stopPropagation())
        media.onchange = updateQuality
        quality.onchange = updateAddress
        retry.onclick = () => loadPost(activePost)
        copy.onclick = () => copyText(address.value)
        copyDebug.onclick = () => copyText(debug.textContent)
        save.onclick = saveVideo
    }

    function records() { return Array.from(posts.get(activePost)?.values() || []) }
    function selected() { return records().find(record => record.id === panel.media.value) }

    function renderMedia() {
        if (!panel?.dialog.open) return
        const previous = panel.media.value
        panel.media.replaceChildren()
        records().forEach((record, index) => panel.media.add(new Option(`视频 ${index + 1}${record.duration ? ` · ${(record.duration / 1000).toFixed(1)} 秒` : ''}`, record.id)))
        if (records().some(record => record.id === previous)) panel.media.value = previous
        panel.media.hidden = panel.media.options.length < 2
        updateQuality()
    }

    function updateQuality() {
        const record = selected()
        panel.quality.replaceChildren()
        for (const [index, variant] of (record?.mp4 || []).entries()) {
            const size = new URL(variant.url).pathname.match(/\/(\d+x\d+)\//)?.[1]
            const label = [size, variant.bitrate ? `${Math.round(variant.bitrate / 1000)} kbps` : 'MP4'].filter(Boolean).join(' · ')
            panel.quality.add(new Option(`${label}${index === 0 ? ' · 最高画质' : ''}`, variant.url))
        }
        const poster = record?.poster
        panel.poster.hidden = !poster
        if (poster && /^https:\/\/pbs\.twimg\.com\//.test(poster)) panel.poster.src = poster
        else panel.poster.removeAttribute('src')
        updateAddress()
    }

    function updateAddress() {
        const record = selected()
        const url = panel.quality.value
        panel.address.value = url
        panel.actions.hidden = panel.addressLabel.hidden = !url
        panel.quality.hidden = !url
        if (url) panel.open.href = url
        else panel.open.removeAttribute('href')
        panel.debug.textContent = JSON.stringify({ version: 1, postId: activePost, mediaId: record?.id || null, source: record?.source || null, allowDownload: record?.allowDownload ?? null, variants: record?.mp4 || [], hls: record?.hls || null, shareMenu: shareDiagnostics }, null, 2)
        panel.status.textContent = url ? '' : loading ? '正在读取视频地址…' : record?.hls ? '仅返回了 HLS 地址，可在调试信息中复制。' : '尚未收到视频地址，可播放视频后重新读取。'
    }

    async function readPost(id, controller) {
        controllers.add(controller)
        const timeout = setTimeout(() => controller.abort(), 12000)
        try {
            const response = await originalFetch.call(window, `/i/web/status/${id}`, { credentials: 'same-origin', signal: controller.signal })
            if (!response.ok) throw new Error(`HTTP ${response.status}`)
            const html = await response.text()
            if (destroyed || controller.signal.aborted) return
            const doc = new DOMParser().parseFromString(html, 'text/html')
            doc.querySelectorAll('script').forEach(readScript)
        } finally {
            clearTimeout(timeout)
            controllers.delete(controller)
        }
    }

    async function loadPost(id) {
        if (!id || loading || destroyed) return
        loading = true
        panel.retry.disabled = true
        if (!records().length) updateAddress()
        const controller = new AbortController()
        metadataController = controller
        try {
            await readPost(id, controller)
        } catch (_) {
            if (!destroyed && !controller.signal.aborted && activePost === id && panel?.dialog.open && !records().length) panel.status.textContent = '读取失败，可播放视频后重试。'
        } finally {
            if (metadataController === controller) {
                metadataController = null
                loading = false
                if (panel && activePost === id) { panel.retry.disabled = false; renderMedia() }
            }
        }
    }

    function openPanel(id, button) {
        if (!panel) makePanel()
        activePost = id
        focusBefore = button
        panel.media.replaceChildren()
        panel.dialog.showModal()
        renderMedia()
        if (!records().length) loadPost(id)
    }

    function closePanel() {
        if (!panel?.dialog.open) return
        panel.dialog.close()
        if (savePrompt && panel.dialog.contains(savePrompt.host)) clearSavePrompt()
        activePost = null
        metadataController?.abort()
        panel.downloadController?.abort()
        metadataController = null
        loading = false
        panel.retry.disabled = false
        if (focusBefore?.isConnected) {
            // dialog.close() can restore focus automatically as well. Clear
            // pointer focus so Safari does not retain an entry focus ring.
            if (keyboardFocus) focusBefore.focus({ preventScroll: true })
            else focusBefore.blur()
        }
    }

    async function copyText(text) {
        const current = panel
        try {
            if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable')
            await navigator.clipboard.writeText(text)
            if (current.dialog.open) current.status.textContent = '已复制'
            return
        } catch (_) { /* Safari may deny the async API; try the user-initiated fallback. */ }
        const input = element('textarea', text)
        input.readOnly = true
        input.style.cssText = 'position:fixed;left:0;top:0;opacity:0'
        current.dialog.appendChild(input)
        input.select()
        let copied = false
        try { copied = document.execCommand('copy') } catch (_) { /* Keep a selectable address on failure. */ }
        input.remove()
        if (!current.dialog.open) return
        if (copied) current.status.textContent = '已复制'
        else {
            if (text === current.address.value) { current.address.focus(); current.address.select() }
            else window.getSelection()?.selectAllChildren(current.debug)
            current.status.textContent = '无法写入剪贴板，请长按内容复制。'
        }
    }

    async function fetchVideoBlob(url, controller) {
        controllers.add(controller)
        const timeout = setTimeout(() => controller.abort(), 60000)
        try {
            const response = await originalFetch.call(window, url, { credentials: 'omit', signal: controller.signal })
            if (!response.ok || !response.headers.get('content-type')?.includes('video/mp4')) throw new Error('Invalid video response')
            if (Number(response.headers.get('content-length')) > maxBytes) { controller.abort(); throw new Error('视频较大，请打开原文件保存。') }
            const chunks = []
            let size = 0
            const reader = response.body.getReader()
            for (;;) {
                const { done, value } = await reader.read()
                if (done) break
                size += value.byteLength
                if (size > maxBytes) { controller.abort(); throw new Error('视频较大，请打开原文件保存。') }
                chunks.push(value)
            }
            return new Blob(chunks, { type: 'video/mp4' })
        } finally {
            clearTimeout(timeout)
            controllers.delete(controller)
        }
    }

    function saveBlob(blob, filename, mount = document.body) {
        const blobURL = URL.createObjectURL(blob)
        objectURLs.add(blobURL)
        const link = element('a')
        link.setAttribute('data-stash-x-video', 'download')
        link.href = blobURL
        link.download = filename
        link.addEventListener('click', event => event.stopPropagation())
        mount.appendChild(link)
        link.click()
        link.remove()
        const timer = setTimeout(() => { URL.revokeObjectURL(blobURL); objectURLs.delete(blobURL); timers.delete(timer) }, 60000)
        timers.add(timer)
    }

    function reportDownloadError(message) {
        downloadNotice?.remove()
        const { host, root } = shadowHost()
        const status = element('p', message)
        status.setAttribute('role', 'status')
        status.style.cssText = 'margin:0;padding:10px 14px;border-radius:4px;background:light-dark(#0f1419,#eff3f4);color:light-dark(#fff,#0f1419)'
        host.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);width:max-content;max-width:calc(100% - 32px);z-index:2147483647;pointer-events:none'
        root.appendChild(status)
        document.body.appendChild(host)
        downloadNotice = host
        const timer = setTimeout(() => { host.remove(); timers.delete(timer) }, 6000)
        timers.add(timer)
    }

    function clearSavePrompt() {
        savePrompt?.host.remove()
        savePrompt = null
    }

    function offerSystemShare(files, mount = document.body) {
        clearSavePrompt()
        const { host, root } = shadowHost()
        host.setAttribute('data-stash-x-video', 'save-prompt')
        const inline = mount !== document.body
        host.style.cssText = inline ? 'display:block;margin:0 16px 16px' : 'position:fixed;bottom:calc(16px + env(safe-area-inset-bottom));left:50%;transform:translateX(-50%);width:440px;max-width:calc(100% - 24px);z-index:2147483647'
        const surface = element('section')
        surface.setAttribute('aria-label', '视频保存')
        surface.style.cssText = 'padding:12px;background:light-dark(#fff,#15202b);border:1px solid light-dark(#cfd9de,#536471);border-radius:6px'
        const status = element('p')
        status.className = 'status'
        status.setAttribute('role', 'status')
        const actions = element('div')
        actions.className = 'actions'
        actions.style.marginTop = '8px'
        const share = iconButton('share', '系统分享')
        const download = iconButton('download', '浏览器下载')
        const dismiss = iconButton('close', '关闭保存提示')
        dismiss.className = 'icon'
        dismiss.querySelector('span').hidden = true
        let supported = false
        try { supported = typeof navigator.share === 'function' && navigator.canShare?.({ files }) === true } catch (_) { /* Unsupported file sharing keeps the browser download available. */ }
        share.hidden = !supported
        status.textContent = supported ? '视频已准备好。' : '此浏览器不支持分享这些视频，可使用浏览器下载。'
        actions.append(share, download, dismiss)
        surface.append(status, actions)
        root.appendChild(surface)
        root.addEventListener('click', event => event.stopPropagation())
        root.addEventListener('keydown', event => {
            if (event.key === 'Escape') { event.stopPropagation(); event.preventDefault(); clearSavePrompt() }
        })
        mount.appendChild(host)
        const current = { host }
        savePrompt = current
        const notify = message => {
            if (inline && panel?.dialog === mount && panel.dialog.open) panel.status.textContent = message
            else reportDownloadError(message)
        }
        dismiss.onclick = clearSavePrompt
        download.onclick = () => {
            for (const file of files) saveBlob(file, file.name, mount)
            clearSavePrompt()
            notify('已请求浏览器下载。')
        }
        share.onclick = async () => {
            if (share.disabled || destroyed || savePrompt !== current) return
            share.disabled = download.disabled = dismiss.disabled = true
            try {
                // Call before any await: iOS requires a fresh user activation.
                await navigator.share({ files })
                if (destroyed || savePrompt !== current) return
                clearSavePrompt()
                notify('已交给系统分享。')
            } catch (error) {
                if (destroyed || savePrompt !== current) return
                status.textContent = error.name === 'AbortError' ? '已取消分享。' : '系统分享未能打开，可重试或使用浏览器下载。'
            } finally {
                share.disabled = download.disabled = dismiss.disabled = false
            }
        }
        if (supported && navigator.userActivation?.isActive) share.onclick()
    }

    async function downloadSharedPost(context) {
        const controller = new AbortController()
        const button = shareRow?.button
        downloadNotice?.remove()
        shareDownloads.set(context.id, controller)
        button?.setAttribute('aria-busy', 'true')
        shareDiagnostics.download = 'preparing'
        if (options.video_save_method === 'system_share') clearSavePrompt()
        const startPath = location.pathname
        try {
            let media = Array.from(posts.get(context.id)?.values() || [])
            if (!media.length || media.some(record => !record.mp4.length)) {
                await readPost(context.id, controller)
                media = Array.from(posts.get(context.id)?.values() || [])
            }
            if (destroyed || controller.signal.aborted) return
            if (media.some(record => record.allowDownload === false)) throw new Error('作者已关闭视频下载。')
            if (!media.length || media.some(record => !record.mp4.length)) throw new Error('未找到可下载的 MP4。')
            const files = []
            let totalBytes = 0
            for (const record of media) {
                const blob = await fetchVideoBlob(record.mp4[0].url, controller)
                if (destroyed || controller.signal.aborted) return
                const filename = `x-${context.id}-${record.id}.mp4`
                if (options.video_save_method === 'system_share') {
                    totalBytes += blob.size
                    if (totalBytes > maxBytes) throw new Error('视频较大')
                    files.push(new File([blob], filename, { type: 'video/mp4' }))
                } else saveBlob(blob, filename)
            }
            if (files.length && location.pathname === startPath) offerSystemShare(files)
            shareDiagnostics.download = 'requested'
        } catch (error) {
            if (destroyed) return
            shareDiagnostics.download = 'failed'
            reportDownloadError(error.message.startsWith('作者') || error.message.startsWith('未找到') ? error.message : error.message.startsWith('视频较大') ? '视频超过 64 MB 下载上限。' : '视频下载失败，请稍后重试。')
        } finally {
            shareDownloads.delete(context.id)
            button?.removeAttribute('aria-busy')
        }
    }

    async function saveVideo() {
        const current = panel
        const id = activePost
        const url = current.address.value
        const filename = `x-${id}-${selected()?.id || 'video'}.mp4`
        if (!url || current.save.disabled) return
        const controller = new AbortController()
        current.downloadController = controller
        current.save.disabled = true
        if (options.video_save_method === 'system_share') clearSavePrompt()
        current.status.textContent = '正在准备视频…'
        try {
            const blob = await fetchVideoBlob(url, controller)
            if (destroyed || activePost !== id || !current.dialog.open) return
            if (options.video_save_method === 'system_share') {
                offerSystemShare([new File([blob], filename, { type: 'video/mp4' })], current.dialog)
                current.status.textContent = ''
            } else {
                saveBlob(blob, filename, current.dialog)
                current.status.textContent = '已请求保存；若浏览器转为播放，可通过系统分享菜单保存。'
            }
        } catch (error) {
            if (activePost === id && current.dialog.open) current.status.textContent = error.message.startsWith('视频较大') ? error.message : '保存失败，请打开原文件后通过浏览器保存。'
        } finally {
            if (current.downloadController === controller) current.downloadController = null
            current.save.disabled = false
        }
    }

    const observer = new MutationObserver(mutations => {
        let changed = false
        for (const mutation of mutations) {
            const target = mutation.target.nodeType === 1 ? mutation.target : mutation.target.parentElement
            if (target?.closest(marker)) continue
            if (target?.tagName === 'SCRIPT') readScript(target)
            for (const node of mutation.addedNodes) {
                if (node.nodeType !== 1 || node.matches(marker)) continue
                if (node.tagName === 'SCRIPT') readScript(node)
                else node.querySelectorAll('script').forEach(readScript)
            }
            if (target?.closest('script, style')) continue
            if (mutation.type === 'childList' && Array.from(mutation.addedNodes).every(node => node.nodeType === 1 && node.matches(`script, style, ${marker}`)) && Array.from(mutation.removedNodes).every(node => node.nodeType === 1 && node.matches('script, style'))) continue
            changed = true
        }
        if (changed) schedule()
    })
    function observe() { observer.observe(document, { subtree: true, childList: true, attributes: true, attributeFilter: ['href', 'src', 'poster', 'data-testid'] }) }
    function readInitial() {
        if (destroyed) return
        if (window.__INITIAL_STATE__) ingest(window.__INITIAL_STATE__, '页面数据')
        document.querySelectorAll('script').forEach(readScript)
        schedule()
    }
    observe()
    listen(document, 'DOMContentLoaded', readInitial, { once: true })
    listen(window, 'pageshow', readInitial)
    listen(document, 'visibilitychange', () => { if (document.visibilityState !== 'hidden') schedule() })
    listen(window, 'popstate', schedule)
    for (const key of ['pushState', 'replaceState']) {
        const original = history[key]
        const wrapper = function (...args) { const result = original.apply(this, args); schedule(); return result }
        history[key] = wrapper
        cleanups.push(() => { if (history[key] === wrapper) history[key] = original })
    }
    window.__stashXVideos = {
        isOpen: () => !!panel?.dialog.open || !!shareContext?.activating || !!savePrompt,
        diagnostics: () => ({
            toolbarEnabled: options.enable_video_tools,
            shareEnabled: options.enable_share_menu_download,
            saveMethod: options.video_save_method,
            players: players(document).length,
            previews: document.querySelectorAll('[data-testid="previewInterstitial"]').length,
            identifiedPlayers: players(document).filter(player => {
                const scope = player.closest('[data-testid="quoteTweet"], [role="link"], article')
                return scope && !!identify(scope)
            }).length,
            entries: Array.from(entries.values()).filter(entry => entry.host.isConnected).length,
            postsWithMedia: posts.size,
            share: { ...shareDiagnostics },
            visibleMenuRoles: Array.from(document.querySelectorAll(menuSelector)).filter(visibleMenu).map(menu => menu.getAttribute('role')).slice(0, 8),
        }),
        destroy() {
            if (destroyed) return
            destroyed = true
            closePanel()
            clearShareRow()
            shareContext = null
            observer.disconnect()
            if (frame !== null) cancelAnimationFrame(frame)
            controllers.forEach(controller => controller.abort())
            shareDownloads.clear()
            downloadNotice?.remove()
            clearSavePrompt()
            timers.forEach(timer => clearTimeout(timer))
            objectURLs.forEach(url => URL.revokeObjectURL(url))
            cleanups.forEach(cleanup => cleanup())
            entries.forEach(entry => entry.host.remove())
            panel?.host.remove()
            posts.clear()
            if (window.fetch === wrappedFetch) window.fetch = originalFetch
            if (XMLHttpRequest.prototype.open === wrappedOpen) XMLHttpRequest.prototype.open = originalOpen
            if (XMLHttpRequest.prototype.send === wrappedSend) XMLHttpRequest.prototype.send = originalSend
            delete window.__stashXVideos
        },
    }
    if (document.readyState !== 'loading') readInitial()
}

const LAYOUT_DIAGNOSTICS_URL = 'https://raw.githubusercontent.com/qsoyq/stash/feat/x-video-tools/script/browser/layout-diagnostics.js'

async function loadLayoutDiagnosticsSource() {
    try {
        const result = await get({ url: LAYOUT_DIAGNOSTICS_URL, timeout: 5 })
        const status = result.response?.status ?? result.response?.statusCode
        if (status >= 200 && status < 300 && typeof result.data === 'string' && result.data.includes('function startLayoutDiagnostics')) {
            return result.data
        }
        echo(`[Warn] 页面布局诊断脚本下载失败：HTTP ${status}`)
    } catch (error) {
        echo(`[Warn] 页面布局诊断脚本下载失败：${error.error || error}`)
    }
    return null
}

function addDiagnosticFailureNotice(document, container) {
    const notice = document.createElement('script')
    notice.textContent = "(function(){var b=document.createElement('button');b.textContent='诊断工具加载失败（点击关闭）';b.style.cssText='position:fixed;right:12px;bottom:calc(env(safe-area-inset-bottom) + 76px);z-index:2147483647;background:#b33;color:white;padding:8px';b.onclick=function(){b.remove()};document.body.appendChild(b)})();"
    container.appendChild(notice)
}

function removeAds(document, options, diagnosticSource = null) {
    const enabled = Object.values(options).some(value => value === true)
    if (!enabled) return false
    const script = document.createElement('script')
    const container = document.body || document.documentElement
    const settings = JSON.stringify(options).replace(/</g, '\\u003c')
    script.textContent = `(${removeAdsCode.toString()})(${settings});`
    if (options.enable_video_tools || options.enable_share_menu_download) {
        const video = document.createElement('script')
        video.setAttribute('data-stash-x-video', 'bootstrap')
        video.textContent = `window.__stashXVideoStatus={version:"20261123.6",phase:"starting"};try{(${startVideoTools.toString()})(${JSON.stringify({ enable_video_tools: options.enable_video_tools, enable_share_menu_download: options.enable_share_menu_download, video_save_method: options.video_save_method })});window.__stashXVideoStatus.phase="ready"}catch(e){window.__stashXVideoStatus.phase="error";window.__stashXVideoStatus.errorName=e.name;}`
        const head = document.head || document.documentElement
        const firstScript = head.querySelector('script')
        if (firstScript) firstScript.before(video)
        else head.appendChild(video)
    }
    if (options.enable_layout_diagnostics && !diagnosticSource) {
        addDiagnosticFailureNotice(document, container)
    } else if (options.enable_layout_diagnostics) {
        const diagnostic = document.createElement('script')
        diagnostic.textContent = diagnosticSource.replace(/<\/script/gi, '<\\/script')
        diagnostic.setAttribute('data-layout-config', JSON.stringify({
            site: 'x',
            hiddenClass: 'x-ad-hidden',
            publicRoutes: ['/home', '/explore'],
            targets: {
                topNav: "[data-testid='TopNavBar']",
                banner: "header[role='banner']",
                primaryColumn: "[data-testid='primaryColumn']",
                sidebarColumn: "[data-testid='sidebarColumn']",
                bottomBar: "[data-testid='BottomBar']",
                bottomGrok: "nav a[href='/i/grok']:not(header a), [data-testid='BottomBar'] a[href='/i/grok']",
                navNotifications: "a[data-testid='AppTabBar_Notifications_Link'], [data-testid='BottomBar'] a[href='/notifications']",
                navMessages: "a[data-testid='AppTabBar_DirectMessage_Link'], [data-testid='BottomBar'] a[href='/messages'], [data-testid='BottomBar'] a[href^='/i/chat']",
            },
            settings: {
                hide_top_nav: options.hide_top_nav,
                hide_home_composer: options.hide_home_composer,
                enable_custom_layout: options.enable_custom_layout,
                center_primary_column: options.center_primary_column,
                hide_bottom_bar: options.hide_bottom_bar,
                hide_bottom_bar_on_scroll: options.hide_bottom_bar_on_scroll,
                hide_nav_notifications: options.hide_nav_notifications,
                hide_nav_messages: options.hide_nav_messages,
                hide_notification_badge: options.hide_notification_badge,
                hide_show_posts_prompt: options.hide_show_posts_prompt,
                enable_video_tools: options.enable_video_tools,
                enable_share_menu_download: options.enable_share_menu_download,
                video_save_method: options.video_save_method,
            },
        }))
        container.appendChild(diagnostic)
    }
    container.appendChild(script)
    return true
}


async function main() {
    const options = getXOptions()
    if (!Object.values(options).some(value => value === true)) {
        $done({})
        return
    }
    switch (getScriptType()) {
        case "response":
            let url = (new URL($request.url))
            let body = getScriptResponseBody()
            let ct = Object.entries($response.headers || {}).find(([name]) => name.toLowerCase() === 'content-type')?.[1]
            if (ct && ct.toLowerCase().includes("text/html") && body) {
                echo(`url: ${url}, path: ${url.pathname}`)
                const document = new DOMParser().parseFromString(body, 'text/html')
                const diagnosticSource = options.enable_layout_diagnostics ? await loadLayoutDiagnosticsSource() : null
                if (!removeAds(document, options, diagnosticSource)) {
                    $done({})
                    break
                }
                // Keep the original document mode; outerHTML alone drops the doctype.
                const doctype = document.doctype
                const declaration = doctype ? `<!DOCTYPE ${doctype.name}${doctype.publicId ? ` PUBLIC "${doctype.publicId}"` : ''}${doctype.systemId ? `${doctype.publicId ? '' : ' SYSTEM'} "${doctype.systemId}"` : ''}>` : ''
                $done({ body: declaration + document.documentElement.outerHTML })
                break
            }
        default:
            $done({})
    }
}

main().catch(error => {
    echo('[Error]', error instanceof Error ? error.message : String(error))
    $done({})
})

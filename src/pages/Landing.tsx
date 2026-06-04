import React, { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  Anchor,
  Group,
  Marquee,
  ThemeIcon,
  UnstyledButton,
  localStorageColorSchemeManager,
  MantineProvider,
} from '@mantine/core'
import { useScrollSpy } from '@mantine/hooks'
import {
  IconArrowRight,
  IconBadgeTm,
  IconBook,
  IconBrain,
  IconBrandGithub,
  IconDatabase,
  IconDeviceGamepad2,
  IconHeart,
  IconSparkles,
  IconTypography,
} from '@tabler/icons-react'
import { Button } from '../components/ui/Button'
import { Footer } from '../components/Footer'
import logo from '@/src/assets/apple-touch-icon.png'

const kanjiDetails = [
  {
    character: '好',
    meaning: 'like / fondness',
    href: 'https://www.wanikani.com/kanji/好',
  },
  {
    character: '学',
    meaning: 'study / learning',
    href: 'https://www.wanikani.com/kanji/学',
  },
  {
    character: '語',
    meaning: 'language / word',
    href: 'https://www.wanikani.com/kanji/語',
  },
  {
    character: '記',
    meaning: 'record / write down',
    href: 'https://www.wanikani.com/kanji/記',
  },
  {
    character: '漢',
    meaning: 'Chinese / Han',
    href: 'https://www.wanikani.com/kanji/漢',
  },
  {
    character: '仮',
    meaning: 'temporary',
    href: 'https://www.wanikani.com/kanji/仮',
  },
  {
    character: '復',
    meaning: 'return / repeat',
    href: 'https://www.wanikani.com/kanji/復',
  },
  {
    character: '遊',
    meaning: 'play',
    href: 'https://www.wanikani.com/kanji/遊',
  },
]

const floatingKanji = kanjiDetails.map(kanji => kanji.character)

const featureCards = [
  {
    icon: IconBrain,
    title: 'WaniKani aware',
    eyebrow: '01 / Sync',
    desc: 'SukiStudy follows your WaniKani progress so lessons, reviews, and extra practice stay focused on what you are actually learning.',
  },
  {
    icon: IconDeviceGamepad2,
    title: 'Practice that changes shape',
    eyebrow: '02 / Play',
    desc: 'Move between typing, matching, recall, memory, and quiz modes when the normal review rhythm starts to feel too familiar.',
  },
  {
    icon: IconBadgeTm,
    title: 'Kana without an account',
    eyebrow: '03 / Guest',
    desc: 'Guest mode gives new learners a gentle place to practice hiragana and katakana before connecting a WaniKani account.',
  },
]

const sourceCards = [
  {
    title: 'Tofugu',
    desc: (
      <>
        <Anchor href="https://www.tofugu.com/japanese/learn-hiragana/" target="_blank" c="#e8590c">
          Hiragana
        </Anchor>{' '}
        &{' '}
        <Anchor href="https://www.tofugu.com/japanese/learn-katakana/" target="_blank" c="#e8590c">
          Katakana
        </Anchor>{' '}
        mnemonics, learning references, and audio resources.
      </>
    ),
    href: 'https://www.tofugu.com/',
    icon: IconBook,
  },
  {
    title: 'WaniKani & Community',
    desc: (
      <>
        <Anchor
          href="https://community.wanikani.com/t/wk-mnemonic-art-for-kanji-levels-1-7-radical-levels-1-10/47656"
          target="_blank"
          className="font-inherit"
          c="#e8590c"
        >
          Mnemonic artwork
        </Anchor>{' '}
        and{' '}
        <Anchor href="https://knowledge.wanikani.com/wanikani/srs/" target="_blank" c="#e8590c">
          SRS knowledge
        </Anchor>{' '}
        and a learning community worth building around.
      </>
    ),
    href: 'https://wanikani.com/',
    icon: IconDatabase,
  },
  {
    title: 'Open source',
    desc: 'Built with React and Mantine, SignalDb and many other resources.',
    href: 'https://github.com/mrdjohnson/SukiStudy',
    icon: IconBrandGithub,
  },
  {
    title: 'Japanese typography',
    desc: 'Japanese typefaces and readable study text supported by Google Fonts.',
    href: 'https://fonts.google.com/',
    icon: IconTypography,
  },
]

const navItems = [
  { id: 'practice', label: 'Practice' },
  { id: 'about', label: 'About' },
  { id: 'sources', label: 'Sources' },
]

const revealVariants = ['fade', 'left', 'right', 'bottom'] as const

const revealVariant = (index: number) => revealVariants[index % revealVariants.length]

const reviewRows = [
  ['見', 'see', 'kanji'],
  ['すき', 'like', 'kana'],
  ['復習', 'review', 'vocab'],
]

const LandingPageThemeManager = localStorageColorSchemeManager({
  key: 'landing-theme',
})

export const Landing: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const scrollSpy = useScrollSpy({
    selector: '[data-landing-section]',
    offset: 140,
    getDepth: () => 2,
    getValue: element => element.getAttribute('data-label') ?? '',
  })

  const activeSectionId = scrollSpy.data[scrollSpy.active]?.id

  const handleGuest = async () => {
    localStorage.setItem('wk_token', 'guest_token')
    navigate('/?guest=true')
  }

  useEffect(() => {
    const targetId =
      location.hash.replace('#', '') || (location.pathname === '/about' ? 'about' : '')
    if (!targetId) return

    window.requestAnimationFrame(() => {
      document.getElementById(targetId)?.scrollIntoView({ block: 'start' })
    })
  }, [location.hash, location.pathname])

  useEffect(() => {
    const revealElements = Array.from(
      document.querySelectorAll<HTMLElement>('[data-landing-reveal]'),
    )

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      revealElements.forEach(element => {
        element.dataset.visible = 'true'
      })
      return
    }

    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (!entry.isIntersecting) return

          const element = entry.target as HTMLElement
          element.dataset.visible = 'true'
          observer.unobserve(element)
        })
      },
      {
        rootMargin: '0px 0px -12% 0px',
        threshold: 0.18,
      },
    )

    revealElements.forEach((element, index) => {
      element.dataset.reveal ||= revealVariant(index)
      element.style.setProperty('--landing-reveal-delay', `${Math.min(index % 4, 3) * 90}ms`)
      observer.observe(element)
    })

    return () => observer.disconnect()
  }, [])

  return (
    <MantineProvider
      defaultColorScheme="light"
      cssVariablesSelector="#landingPage"
      colorSchemeManager={LandingPageThemeManager}
      getRootElement={() => document.getElementById('landingPage')!}
    >
      <div
        className="landing-page relative min-h-svh overflow-hidden bg-[#f3ead8] text-[#151a17]"
        id="landingPage"
      >
        <div
          aria-hidden
          className="pointer-events-none fixed inset-0 overflow-hidden mask-[linear-gradient(to_bottom,black,transparent_90%)]"
        >
          <div className="absolute inset-0 bg-[linear-gradient(rgba(21,26,23,.07)_1px,transparent_1px),linear-gradient(90deg,rgba(21,26,23,.05)_1px,transparent_1px)] bg-size-[44px_44px] rounded-xl" />
          <svg
            viewBox="0 0 720 720"
            className="absolute -right-32 top-72 hidden size-152 text-[#151a17] opacity-80 md:block"
          >
            <text
              x="50%"
              y="54%"
              textAnchor="middle"
              dominantBaseline="middle"
              className="landing-stroke-kanji fill-transparent stroke-current stroke-[1.8] font-serif text-[27rem] font-black"
            >
              好
            </text>
          </svg>
          {floatingKanji.map((kanji, index) => (
            <span
              key={kanji}
              className={[
                'landing-kanji absolute font-serif text-7xl font-black text-[#151a17]/6 md:text-9xl',
                index === 0 && 'left-[7%] top-[18%]',
                index === 1 && 'right-[12%] top-[12%]',
                index === 2 && 'left-[18%] top-[58%]',
                index === 3 && 'right-[22%] top-[52%]',
                index === 4 && 'left-[62%] top-[28%]',
                index === 5 && 'left-[4%] top-[78%]',
                index === 6 && 'right-[5%] top-[76%]',
                index === 7 && 'left-[45%] top-[84%]',
              ]
                .filter(Boolean)
                .join(' ')}
              style={{ animationDelay: `${index * -2.1}s` }}
            >
              {kanji}
            </span>
          ))}
        </div>

        <header className="fixed inset-x-0 top-0 z-50 px-5 py-4 md:px-8">
          <div className="mx-auto flex w-full max-w-7xl items-center justify-between">
            <UnstyledButton
              component={'a'}
              href="/landing"
              className="p-1! flex items-center gap-3 rounded-lg border border-[#151a17]/10 bg-[#fffaf0]/60 px-2 py-2 font-semibold text-[#151a17] shadow-sm backdrop-blur-md text-shadow-white/50 text-shadow-xs"
            >
              <ThemeIcon size="lg" radius="md" variant="transparent">
                <img src={logo} alt="SukiStudy logo" />
              </ThemeIcon>
              <span className="text-lg">SukiStudy</span>
            </UnstyledButton>

            <nav className="hidden items-center gap-2 rounded-lg border border-[#151a17]/10 bg-[#fffaf0]/55 p-1 text-sm font-semibold text-[#151a17]/70 shadow-sm backdrop-blur-md md:flex">
              {navItems.map(item => (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  className={[
                    'rounded-md px-3 py-2 transition-colors',
                    activeSectionId === item.id
                      ? 'bg-[#151a17] text-[#fffaf0]'
                      : 'hover:bg-[#151a17]/10 hover:text-[#c43c2b]',
                  ].join(' ')}
                >
                  {item.label}
                </a>
              ))}
            </nav>

            <Button variant="ghost" onClick={() => navigate('/login')} className="font-semibold">
              Login
            </Button>
          </div>
        </header>

        <main className="relative z-10">
          <section
            id="home"
            data-landing-section
            data-label="Home"
            className="mx-auto grid min-h-svh w-full max-w-7xl items-center gap-10 px-5 pb-10 pt-28 md:grid-cols-[1.05fr_.95fr] md:px-8 md:pb-16 md:pt-32"
          >
            <div className="max-w-3xl">
              <div className="mb-5 inline-flex items-center gap-2 rounded-lg border border-[#151a17]/15 bg-[#fffaf0]/70 px-3 py-2 text-xs font-bold uppercase tracking-[.18em] text-[#c43c2b] shadow-sm backdrop-blur-xl">
                <IconSparkles size={16} />
                Japanese study, with a pulse
              </div>

              <h1 className="text-6xl font-black leading-[.88] tracking-normal text-[#151a17] md:text-8xl lg:text-9xl">
                SukiStudy
              </h1>
              <p className="mt-7 max-w-2xl text-xl font-medium leading-8 text-[#334139] md:text-2xl md:leading-9">
                A playful study companion for WaniKani users, kana learners, and anyone who wants
                Japanese practice to feel more alive.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button
                  size="xl"
                  onClick={() => navigate('/login')}
                  leftSection={<IconBook size={20} />}
                  radius="md"
                  className="bg-[#c43c2b]! shadow-lg shadow-[#c43c2b]/20"
                >
                  Connect WaniKani
                </Button>
                <Button
                  size="xl"
                  variant="outline"
                  color="dark"
                  onClick={handleGuest}
                  rightSection={<IconArrowRight size={18} />}
                  radius="md"
                  className="bg-[#fffaf0]/70! backdrop-blur-md"
                >
                  Enter as Guest
                </Button>
              </div>

              <div className="mt-8 grid max-w-xl grid-cols-3 gap-2 rounded-lg border border-[#151a17]/15 bg-[#fffaf0]/40 px-4 py-4 text-center shadow-sm backdrop-blur-md sm:text-left">
                {[
                  ['Kana', 'guest ready'],
                  ['Kanji', 'review aware'],
                  ['Games', 'varied recall'],
                ].map(([label, value]) => (
                  <div key={label}>
                    <p className="text-2xl font-black text-[#151a17]">{label}</p>
                    <p className="mt-1 text-[0.65rem] font-bold uppercase tracking-[.1em] text-[#5d6f65] sm:text-xs sm:tracking-[.12em]">
                      {value}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative mx-auto w-full max-w-xl">
              <div className="absolute -left-4 top-8 hidden h-32 w-32 border border-[#151a17]/15 bg-[#f5c84b] md:block rounded-xs" />
              <div className="absolute -right-4 bottom-10 hidden h-28 w-28 border border-[#151a17]/15 bg-[#2d8f7b] md:block" />

              <div className="landing-card-rise relative rounded-lg border border-[#151a17]/20 bg-[#fffaf0]/70 p-4 shadow-[12px_12px_0_rgba(21,26,23,.12)] backdrop-blur-xl">
                <div className="flex items-center justify-between border-b border-[#151a17]/10 pb-4">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[.18em] text-[#c43c2b]">
                      Today
                    </p>
                    <p className="mt-1 text-2xl font-black">Review flow</p>
                  </div>
                  <div className="grid size-14 place-items-center bg-[#151a17] font-serif text-3xl font-black text-white rounded-xs">
                    好
                  </div>
                </div>

                <div className="mt-5 grid gap-3">
                  {reviewRows.map(([term, meaning, type], index) => (
                    <div
                      key={term}
                      className="grid grid-cols-[56px_1fr_auto] items-center gap-3 rounded-lg border border-[#151a17]/10 bg-[#fffaf0]/60 p-3 shadow-sm backdrop-blur-md"
                    >
                      <div className="grid size-14 place-items-center rounded-md bg-[#fffaf0]/90 font-serif text-2xl font-black shadow-sm">
                        {term}
                      </div>
                      <div>
                        <p className="font-black text-[#151a17]">{meaning}</p>
                        <div className="mt-2 h-1.5 overflow-hidden bg-[#151a17]/10">
                          <div
                            className="landing-pulse-line h-full origin-left bg-[#c43c2b]"
                            style={{ animationDelay: `${index * 0.35}s` }}
                          />
                        </div>
                      </div>
                      <span className="rounded-md border border-[#151a17]/15 bg-[#fffaf0]/80 px-2 py-1 text-xs font-bold uppercase text-[#53645b]">
                        {type}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="mt-5 grid grid-cols-3 gap-3">
                  {['typing', 'quiz', 'recall'].map(mode => (
                    <div
                      key={mode}
                      className="rounded-md bg-[#151a17] px-3 py-4 text-center text-white"
                    >
                      <p className="text-xs font-bold uppercase tracking-[.12em] text-white/60">
                        mode
                      </p>
                      <p className="mt-1 font-black">{mode}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <div data-landing-reveal data-reveal="fade">
            <Marquee
              pauseOnHover
              className="bg-black"
              classNames={{ content: 'landing-marquee-content' }}
              duration={110000}
              fadeEdgeColor="#151a17"
            >
              <div className="flex w-max gap-4 py-2 whitespace-nowrap text-lg font-black uppercase tracking-[.14em]">
                {kanjiDetails.map((kanji, index) => (
                  <Group key={`${kanji.character}-${index}`}>
                    <Anchor
                      href={kanji.href}
                      target="_blank"
                      rel="noreferrer"
                      title={`${kanji.character}: ${kanji.meaning}`}
                      className="flex items-center gap-4 rounded-lg px-2 py-1 text-white! no-underline! focus-visible:bg-white/10 transition-opacity ease-in-out duration-300 opacity-80 hover:opacity-100 group"
                    >
                      <Group
                        className="border-b-2! border-transparent group-hover:border-white! transition-colors ease-in-out duration-300"
                        gap="xs"
                      >
                        <span className="font-serif text-3xl text-[#f5c84b]">
                          {kanji.character}
                        </span>
                        <span className="hidden text-sm tracking-[.08em] md:inline">
                          {kanji.meaning}
                        </span>
                      </Group>
                    </Anchor>

                    <span className="border-x border-white/20 px-4 text-white/90">
                      practice with momentum
                    </span>
                  </Group>
                ))}
              </div>
            </Marquee>
          </div>

          <section
            id="practice"
            data-landing-section
            data-label="Practice"
            className="scroll-mt-28 mx-auto w-full max-w-7xl px-5 py-20 md:px-8"
          >
            <div className="grid gap-10 md:grid-cols-[.75fr_1.25fr]">
              <div data-landing-reveal data-reveal="left">
                <p className="text-sm font-black uppercase tracking-[.18em] text-[#2d8f7b]">
                  Practice system
                </p>
                <h2 className="mt-3 text-4xl font-black leading-tight md:text-6xl">
                  More ways to remember the same thing.
                </h2>
              </div>

              <div className="grid gap-4 lg:grid-cols-3">
                {featureCards.map((feature, index) => (
                  <article
                    key={feature.title}
                    data-landing-reveal
                    data-reveal={revealVariant(index + 1)}
                    className="rounded-lg border border-[#151a17]/15 bg-[#fffaf0]/60 p-5 shadow-sm backdrop-blur-xl"
                  >
                    <feature.icon size={28} className="text-[#c43c2b]" />
                    <p className="mt-5 text-xs font-black uppercase tracking-[.16em] text-[#5d6f65]">
                      {feature.eyebrow}
                    </p>
                    <h3 className="mt-2 text-2xl font-black leading-tight">{feature.title}</h3>
                    <p className="mt-4 leading-7 text-[#53645b]">{feature.desc}</p>
                  </article>
                ))}
              </div>
            </div>
          </section>

          <section
            id="about"
            data-landing-section
            data-label="About"
            className="scroll-mt-28 border-y border-[#151a17]/15 bg-[#fffaf0]/45 backdrop-blur-md"
          >
            <div className="mx-auto grid w-full max-w-7xl gap-10 px-5 py-20 md:grid-cols-[.9fr_1.1fr] md:px-8">
              <div
                data-landing-reveal
                data-reveal="left"
                className="grid min-h-72 place-items-center rounded-lg border border-[#151a17]/15 bg-[#f5c84b]/90 p-8 shadow-[10px_10px_0_rgba(21,26,23,.12)] backdrop-blur-sm"
              >
                <div className="text-center">
                  <p className="font-serif text-9xl font-black leading-none md:text-[12rem]">文</p>
                  <p className="mt-3 text-sm font-black uppercase tracking-[.2em]">writing</p>
                </div>
              </div>

              <div data-landing-reveal data-reveal="right" className="self-center">
                <p className="text-sm font-black uppercase tracking-[.18em] text-[#c43c2b]">
                  Why Suki?
                </p>
                <h2 className="mt-3 text-4xl font-black leading-tight md:text-6xl">
                  The best study habit is the one you want to return to.
                </h2>
                <p className="mt-6 text-lg leading-8 text-[#53645b]">
                  In Japanese, <strong className="text-[#151a17]">Suki (好き)</strong> means like,
                  fondness, or affection. SukiStudy was made to add more learning and repetition
                  options to WaniKani, with kana practice and small game loops that make the journey
                  less repetitive.
                </p>
                <blockquote className="mt-6 border-l-4 border-[#c43c2b] pl-5 text-xl font-semibold leading-8 text-[#151a17]">
                  The most effective learning happens when you genuinely enjoy what you are doing.
                </blockquote>
              </div>
            </div>
          </section>

          <section
            id="sources"
            data-landing-section
            data-label="Sources"
            className="scroll-mt-28 mx-auto w-full max-w-7xl px-5 py-20 md:px-8"
          >
            <div className="mb-10 flex flex-col justify-between gap-4 md:flex-row md:items-end">
              <div>
                <p className="text-sm font-black uppercase tracking-[.18em] text-[#2d8f7b]">
                  Credits
                </p>
                <h2 className="mt-3 text-4xl font-black leading-tight md:text-6xl">
                  Built on generous learning resources.
                </h2>
              </div>
              <p className="max-w-md leading-7 text-[#53645b]">
                SukiStudy is a third-party app shaped by the Japanese learning community, open
                tooling, and careful typography.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {sourceCards.map((source, index) => (
                <Anchor
                  key={source.title}
                  href={source.href}
                  target="_blank"
                  rel="noreferrer"
                  underline="never"
                  data-landing-reveal
                  data-reveal={revealVariant(index)}
                  className="group rounded-lg border border-[#151a17]/15 bg-[#fffaf0]/70 p-5! text-[#151a17]! no-underline shadow-sm backdrop-blur-xl transition-transform! hover:-translate-y-1 ease-in-out! duration-200! hover:scale-105"
                >
                  <source.icon size={26} className="text-[#c43c2b]" />
                  <h3 className="mt-5 text-xl font-black">{source.title}</h3>
                  <p className="mt-3 leading-7 text-[#53645b]">{source.desc}</p>
                  <span className="mt-5 inline-flex items-center gap-2 text-sm font-black uppercase tracking-[.14em] text-[#2d8f7b] border-transparent group-hover:border-[#2d8f7b] border-b transition-colors ease-in-out duration-200">
                    Visit <IconArrowRight size={16} />
                  </span>
                </Anchor>
              ))}
            </div>
          </section>

          <section className="mx-auto w-full max-w-7xl px-5 pb-32 md:px-8 md:pb-44">
            <div
              data-landing-reveal
              data-reveal="bottom"
              className="grid gap-6 rounded-lg border border-[#151a17]/15 bg-[#151a17] p-6 text-white shadow-[12px_12px_0_rgba(196,60,43,.25)] md:grid-cols-[1fr_auto] md:items-center md:p-8"
            >
              <div className="flex items-start gap-4">
                <IconHeart size={32} className="mt-1 text-[#f5c84b]" />
                <div>
                  <h2 className="text-3xl font-black md:text-5xl">
                    Make review time easier to like.
                  </h2>
                  <p className="mt-3 max-w-2xl text-white/70">
                    Connect WaniKani for synced study, or start with guest kana practice.
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <Button size="lg" color="red" radius="md" onClick={() => navigate('/login')}>
                  Connect
                </Button>
                <Button size="lg" variant="white" color="dark" radius="md" onClick={handleGuest}>
                  Guest mode
                </Button>
              </div>
            </div>
          </section>
        </main>

        <div className="pb-12 md:pb-16">
          <Footer showAbout={false} showLastUpdated />
        </div>
      </div>
    </MantineProvider>
  )
}

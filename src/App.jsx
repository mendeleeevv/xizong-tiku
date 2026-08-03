import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import physioData from './data'
import neikeData from './data-neike'

const SUBJECTS = {
  physio: {
    key: 'physio',
    label: '生理',
    title: '生理学 · 血液循环',
    subtitle: '306 西综（生理学）',
    sectionLabel: '章节',
    content: physioData,
  },
  neike: {
    key: 'neike',
    label: '内科',
    title: '内科学 · 肾内科 / 内分泌 / 糖尿病',
    subtitle: '306 西综（内科学）',
    sectionLabel: '章节',
    content: neikeData,
  },
}

const STORAGE = {
  progress: 'xizong-tiku-progress',
  favorites: 'xizong-tiku-favorites',
  notes: 'xizong-tiku-notes',
  subject: 'xizong-subject',
  dark: 'xizong-dark',
}

function loadJSON(key, fallback) {
  try {
    const saved = localStorage.getItem(key)
    return saved ? JSON.parse(saved) : fallback
  } catch { return fallback }
}

function saveJSON(key, value) {
  localStorage.setItem(key, JSON.stringify(value))
}

function kindLabel(group) {
  return group.type === 'b_type' ? 'B型题' : '问答题'
}

function Icon({ name, size = 18, stroke = 'currentColor' }) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke,
    strokeWidth: 1.8,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': true,
  }
  const paths = {
    menu: <><path d="M4 6h16M4 12h16M4 18h16" /></>,
    book: <><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H19v16H6.5A2.5 2.5 0 0 0 4 21.5z" /><path d="M4 5.5v16M8 7h7M8 11h7" /></>,
    heart: <><path d="M20.8 8.8c0 5-8.8 10.2-8.8 10.2S3.2 13.8 3.2 8.8A4.8 4.8 0 0 1 12 6a4.8 4.8 0 0 1 8.8 2.8Z" /><path d="M5 11h3l1.2-2.2 2.1 5 1.4-2.8H19" /></>,
    search: <><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4.5 4.5" /></>,
    chevron: <path d="m7 9 5 5 5-5" />,
    arrow: <><path d="M5 12h13" /><path d="m13 6 6 6-6 6" /></>,
    left: <><path d="M19 12H5" /><path d="m11 18-6-6 6-6" /></>,
    right: <><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></>,
    bookmark: <path d="M6 4.5A1.5 1.5 0 0 1 7.5 3h9A1.5 1.5 0 0 1 18 4.5V21l-6-3.5L6 21z" />,
    bookmarkFill: <path d="M6 4.5A1.5 1.5 0 0 1 7.5 3h9A1.5 1.5 0 0 1 18 4.5V21l-6-3.5L6 21z" fill="currentColor" />,
    note: <><rect x="5" y="3" width="14" height="18" rx="2" /><path d="M8 8h8M8 12h8M8 16h5" /></>,
    eye: <><path d="M2.5 12s3.5-5 9.5-5 9.5 5 9.5 5-3.5 5-9.5 5-9.5-5-9.5-5z" /><circle cx="12" cy="12" r="2.2" /></>,
    check: <path d="m5 12 4.2 4.2L19 6.5" />,
    alert: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5M12 16h.01" /></>,
    close: <><path d="m6 6 12 12M18 6 6 18" /></>,
    chart: <><path d="M3 3v18h18" /><path d="M18 17V9" /><path d="M13 17V5" /><path d="M8 17v-3" /></>,
    file: <><path d="M6 3h8l4 4v14H6z" /><path d="M14 3v5h4M8 12h8M8 16h6" /></>,
    moon: <><path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5Z" /></>,
    sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></>,
    zoom: <><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /><path d="M11 8v6M8 11h6" /></>,
  }
  return <svg {...common}>{paths[name] || paths.book}</svg>
}

export default function App() {
  const [subjectKey, setSubjectKey] = useState(() => localStorage.getItem(STORAGE.subject) || 'physio')
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem(STORAGE.dark) === '1')
  const [groupIndex, setGroupIndex] = useState(0)
  const [progress, setProgress] = useState(() => loadJSON(STORAGE.progress, {}))
  const [favorites, setFavorites] = useState(() => loadJSON(STORAGE.favorites, []))
  const [notes, setNotes] = useState(() => loadJSON(STORAGE.notes, {}))
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth >= 769)
  const [rightPanelOpen, setRightPanelOpen] = useState(() => window.innerWidth >= 769)
  const [rightPanelTab, setRightPanelTab] = useState('dashboard')
  const [scrollToQid, setScrollToQid] = useState(null)
  const [showNote, setShowNote] = useState(false)
  const searchRef = useRef(null)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode)
    localStorage.setItem(STORAGE.dark, darkMode ? '1' : '0')
  }, [darkMode])

  useEffect(() => saveJSON(STORAGE.progress, progress), [progress])
  useEffect(() => saveJSON(STORAGE.favorites, favorites), [favorites])
  useEffect(() => saveJSON(STORAGE.notes, notes), [notes])

  useEffect(() => {
    function onKey(event) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        searchRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    if (scrollToQid) {
      const timer = setTimeout(() => {
        const el = document.getElementById(`q-${scrollToQid}`)
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' })
          el.classList.add('highlight-flash')
          setTimeout(() => el.classList.remove('highlight-flash'), 1200)
        }
        setScrollToQid(null)
      }, 150)
      return () => clearTimeout(timer)
    }
  }, [scrollToQid, groupIndex])

  const subject = SUBJECTS[subjectKey] || SUBJECTS.physio
  const sections = subject.content.sections

  const allGroups = useMemo(() => {
    const result = []
    sections.forEach((section, si) => {
      section.groups.forEach((group, gi) => {
        result.push({ sectionIdx: si, groupIdx: gi, section, group, id: `${si}-${gi}` })
      })
    })
    return result
  }, [sections])

  const filteredGroups = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return allGroups.filter(({ section, group }) => {
      if (filterType !== 'all' && group.type !== filterType) return false
      if (!q) return true
      const inQuestions = group.questions.some(qq =>
        qq.text.toLowerCase().includes(q) ||
        (qq.answer && qq.answer.toLowerCase().includes(q)) ||
        (qq.note || '').toLowerCase().includes(q)
      )
      const inOptions = (group.sharedOptions || []).some(o => o.text.toLowerCase().includes(q))
      return inQuestions || inOptions || group.title.toLowerCase().includes(q) || section.name.toLowerCase().includes(q)
    })
  }, [allGroups, searchQuery, filterType])

  useEffect(() => {
    if (groupIndex >= filteredGroups.length) setGroupIndex(0)
  }, [filteredGroups.length, groupIndex])

  const current = filteredGroups[groupIndex] || null
  const totalGroups = filteredGroups.length

  const totalQuestions = useMemo(() => allGroups.reduce((sum, g) => sum + g.group.questions.length, 0), [allGroups])
  const sectionCounts = useMemo(() => sections.map(sec => ({
    name: sec.name,
    count: sec.groups.reduce((sum, g) => sum + g.questions.length, 0),
  })), [sections])

  const handleSwitchSubject = useCallback((key) => {
    setSubjectKey(key)
    localStorage.setItem(STORAGE.subject, key)
    setGroupIndex(0)
    setSearchQuery('')
  }, [])

  const goTo = useCallback((offset) => {
    if (!filteredGroups.length) return
    setGroupIndex(prev => (prev + offset + filteredGroups.length) % filteredGroups.length)
    setShowNote(false)
  }, [filteredGroups.length])

  const jumpTo = useCallback((index) => {
    if (!filteredGroups.length) return
    setGroupIndex(Math.min(Math.max(index, 0), filteredGroups.length - 1))
    setShowNote(false)
  }, [filteredGroups.length])

  const goToGroup = useCallback((si, gi, qid) => {
    const idx = allGroups.findIndex(g => g.sectionIdx === si && g.groupIdx === gi)
    if (idx >= 0) {
      setGroupIndex(idx)
      setSearchQuery('')
      setFilterType('all')
    }
    setSidebarOpen(false)
    setShowNote(false)
    if (qid) setScrollToQid(qid)
  }, [allGroups])

  const closeAllDrawers = useCallback(() => {
    setSidebarOpen(false)
    setRightPanelOpen(false)
  }, [])

  const toggleSidebar = useCallback(() => {
    setSidebarOpen(prev => !prev)
    setRightPanelOpen(false)
  }, [])

  const toggleRightPanel = useCallback(() => {
    setRightPanelOpen(prev => !prev)
  }, [])

  const markQuestion = useCallback((qid, status) => {
    setProgress(prev => {
      const next = { ...prev }
      if (status) next[qid] = status
      else delete next[qid]
      return next
    })
  }, [])

  const toggleFavorite = useCallback((groupId) => {
    setFavorites(prev => prev.includes(groupId) ? prev.filter(id => id !== groupId) : [...prev, groupId])
  }, [])

  const setNote = useCallback((groupId, text) => {
    setNotes(prev => ({ ...prev, [groupId]: text }))
  }, [])

  const stats = useMemo(() => {
    let total = 0, answered = 0, correct = 0
    allGroups.forEach(({ group }) => {
      group.questions.forEach(q => {
        total++
        if (progress[q.id]) {
          answered++
          if (progress[q.id] === 'correct') correct++
        }
      })
    })
    return { total, answered, correct, wrong: answered - correct, pct: total ? Math.round(answered / total * 100) : 0 }
  }, [allGroups, progress])

  const wrongItems = useMemo(() => {
    const items = []
    allGroups.forEach(({ sectionIdx: si, groupIdx: gi, section, group }) => {
      group.questions.forEach((q, qi) => {
        if (progress[q.id] === 'wrong') {
          items.push({ sectionIdx: si, groupIdx: gi, id: `${si}-${gi}`, sectionName: section.name, groupTitle: group.title, question: q, qi })
        }
      })
    })
    return items
  }, [allGroups, progress])

  const chapterStats = useMemo(() => {
    return sections.map(section => {
      let total = 0, done = 0
      section.groups.forEach(group => {
        group.questions.forEach(q => {
          total++
          if (progress[q.id]) done++
        })
      })
      return { name: section.name, total, done, pct: total ? Math.round(done / total * 100) : 0 }
    })
  }, [sections, progress])

  const openPanel = useCallback((tab) => {
    setRightPanelTab(tab)
    setRightPanelOpen(true)
  }, [])

  const favorite = current ? favorites.includes(current.id) : false

  return (
    <div className={`app ${darkMode ? 'dark' : ''}`}>
      <div className={`overlay ${sidebarOpen || rightPanelOpen ? 'show' : ''}`} onClick={closeAllDrawers} />

      <header className="topbar">
        <div className="topbar-left">
          <button className="menu-btn" onClick={toggleSidebar} aria-label="目录">
            <Icon name="menu" size={18} />
          </button>
          <div className="subject-switch">
            {Object.values(SUBJECTS).map(s => (
              <button key={s.key} className={subjectKey === s.key ? 'active' : ''} onClick={() => handleSwitchSubject(s.key)}>
                {s.label}
              </button>
            ))}
          </div>
          <div className="brand" onClick={() => goToGroup(0, 0)} title="回到首页">
            <div className="brand-logo"><Icon name="heart" size={19} stroke="white" /></div>
            <div className="brand-text">
              <span className="brand-title">{subject.title}</span>
              <span className="brand-sub">{subject.subtitle}</span>
            </div>
          </div>
        </div>

        <div className="topbar-center">
          <div className="search-wrap">
            <Icon name="search" size={14} />
            <input
              ref={searchRef}
              placeholder="搜索题目 / 关键词"
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setGroupIndex(0) }}
            />
            <kbd>⌘K</kbd>
          </div>
        </div>

        <div className="topbar-right">
          <select className="filter-select" value={filterType} onChange={e => { setFilterType(e.target.value); setGroupIndex(0) }}>
            <option value="all">全部题型</option>
            <option value="b_type">B型题</option>
            <option value="qa">问答题</option>
          </select>

          <div className="progress-strip" onClick={() => openPanel('dashboard')} title="打开学习面板">
            <span>本轮进度</span>
            <strong>{totalGroups ? Math.min(groupIndex + 1, totalGroups) : 0} / {totalGroups} 组</strong>
            <div className="progress-bar"><i style={{ width: `${totalGroups ? ((groupIndex + 1) / totalGroups) * 100 : 0}%` }} /></div>
            <span>{totalGroups ? Math.round(((groupIndex + 1) / totalGroups) * 100) : 0}%</span>
          </div>

          <button className="icon-btn" onClick={() => openPanel('dashboard')} title="学习面板" aria-label="学习面板">
            <Icon name="chart" size={16} />
          </button>
          <button className="icon-btn" onClick={() => openPanel('evidence')} title="本题依据" aria-label="本题依据">
            <Icon name="eye" size={16} />
          </button>
          <button className="icon-btn" onClick={() => openPanel('wrongbook')} title="错题本" aria-label="错题本">
            <Icon name="book" size={16} />
            {wrongItems.length > 0 && <sup>{wrongItems.length}</sup>}
          </button>
          <button className="icon-btn" onClick={() => setDarkMode(!darkMode)} title="切换暗色模式" aria-label="切换暗色模式">
            <Icon name={darkMode ? 'sun' : 'moon'} size={16} />
          </button>
        </div>
      </header>

      <div className="layout">
        <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
          <div className="sidebar-header">
            <strong>{subject.sectionLabel}</strong>
            <button className="icon-btn" onClick={() => setSidebarOpen(false)} aria-label="关闭"><Icon name="close" size={14} /></button>
          </div>
          <div className="sidebar-content">
            {searchQuery || filterType !== 'all' ? (
              <div className="search-results-count">
                搜索到 {filteredGroups.length} 组
                <button className="clear-filter-btn" onClick={() => { setSearchQuery(''); setFilterType('all'); setGroupIndex(0) }}>清除筛选</button>
              </div>
            ) : (
              <button className={`group-nav-btn all-link ${groupIndex === 0 && !searchQuery && filterType === 'all' ? 'active' : ''}`} onClick={() => goToGroup(0, 0)}>
                <span className="type-badge all">全部</span>
                <span className="group-nav-title">全部题目</span>
                <span className="group-nav-progress">{totalQuestions} 题</span>
              </button>
            )}
            <nav>
              {sections.map((section, si) => (
                <div key={si} className="section-nav">
                  <div className="section-title">
                    {section.name}
                    <em>{sectionCounts[si]?.count || 0} 题</em>
                  </div>
                  {section.groups.map((group, gi) => {
                    const isActive = current && current.sectionIdx === si && current.groupIdx === gi
                    const done = group.questions.filter(q => progress[q.id] === 'correct').length
                    const isFavorite = favorites.includes(`${si}-${gi}`)
                    return (
                      <button key={gi} className={`group-nav-btn ${isActive ? 'active' : ''}`} onClick={() => goToGroup(si, gi)}>
                        <span className={`type-badge ${group.type}`}>
                          {group.type === 'b_type' ? 'B型' : '问答'}
                        </span>
                        <span className="group-nav-title">{group.title}</span>
                        <span className="group-nav-progress">
                          {isFavorite ? '★ ' : ''}{done}/{group.questions.length}
                        </span>
                      </button>
                    )
                  })}
                </div>
              ))}
            </nav>
          </div>

          <div className="sidebar-footer">
            <div className="source-stat">
              <span>题库来源</span>
              <strong>{subject.title}</strong>
              <small>{sections.length} 个章节 · {allGroups.length} 个题组 · {totalQuestions} 道题</small>
            </div>
            <div className="sf-stats">
              <div className="sf-stat">
                <span className="sf-stat-val">{stats.answered}<span className="sf-stat-unit">/{stats.total}</span></span>
                <span className="sf-stat-label">已答</span>
              </div>
              <div className="sf-stat">
                <span className="sf-stat-val sf-correct">{stats.correct}</span>
                <span className="sf-stat-label">正确</span>
              </div>
              <div className="sf-stat">
                <span className="sf-stat-val sf-wrong">{stats.wrong}</span>
                <span className="sf-stat-label">错题</span>
              </div>
            </div>
            <div className="sf-progress-bar"><i style={{ width: `${stats.pct}%` }} /></div>
            <div className="sf-actions">
              <button className="sf-action-btn" onClick={() => { openPanel('dashboard'); setSidebarOpen(false) }}>
                <Icon name="chart" size={14} /> 学习面板
              </button>
              <button className="sf-action-btn sf-wrong-btn" onClick={() => { openPanel('wrongbook'); setSidebarOpen(false) }}>
                <Icon name="book" size={14} /> 错题本 {wrongItems.length > 0 && <span className="sf-badge">{wrongItems.length}</span>}
              </button>
            </div>
          </div>
        </aside>

        <main className="content">
          {!current ? (
            <div className="empty-state">
              <div className="empty-state-icon"><Icon name="search" size={22} /></div>
              <h1>当前筛选下没有题目</h1>
              <p>试试清除搜索词、切换题型或打开全部章节。</p>
              <button className="primary-button" onClick={() => { setSearchQuery(''); setFilterType('all'); setGroupIndex(0) }}>
                显示全部题库 <Icon name="arrow" size={17} />
              </button>
            </div>
          ) : (
            <>
              <div className="breadcrumb">
                <span>{current.section.name}</span>
                <Icon name="chevron" size={13} />
                <span>{kindLabel(current.group)}</span>
                {current.group.sourcePage && (
                  <>
                    <Icon name="chevron" size={13} />
                    <strong>原题第{current.group.sourcePage}页</strong>
                  </>
                )}
              </div>

              <div className="content-heading">
                <div>
                  <h1>{current.group.title || '题库原题'}</h1>
                  <p>
                    {current.group.type === 'b_type'
                      ? '共用选项保留在本组内；每个题干独立作答，提交后逐题反馈。'
                      : '先默写或口述，再看答案并自评掌握程度。'}
                  </p>
                </div>
                <div className="heading-actions">
                  <button className={`ghost-button ${favorite ? 'selected' : ''}`} onClick={() => toggleFavorite(current.id)}>
                    <Icon name={favorite ? 'bookmarkFill' : 'bookmark'} size={17} />{favorite ? '已收藏' : '收藏'}
                  </button>
                  <button className="ghost-button" onClick={() => setShowNote(v => !v)}>
                    <Icon name="note" size={17} />笔记
                  </button>
                </div>
              </div>

              {showNote && (
                <div className="note-strip">
                  <Icon name="note" size={17} />
                  <input value={notes[current.id] || ''} onChange={e => setNote(current.id, e.target.value)} placeholder="写下你的易错点或记忆口诀…" />
                </div>
              )}

              {current.group.type === 'b_type' ? (
                <BTypeGroup key={current.id} item={current} progress={progress} onMark={markQuestion} />
              ) : (
                <QAGroup sectionName={current.section.name} group={current.group} progress={progress} onMark={markQuestion} />
              )}

              <div className="bottom-nav">
                <button className="pager-button" onClick={() => goTo(-1)}><Icon name="left" size={18} />上一组</button>
                <GroupJump current={groupIndex + 1} total={totalGroups} onJump={jumpTo} />
                <button className="pager-button" onClick={() => goTo(1)}>下一组<Icon name="right" size={18} /></button>
              </div>
            </>
          )}
        </main>

        <aside className={`right-panel ${rightPanelOpen ? 'open' : ''}`}>
          <div className="rp-header">
            <strong>
              {rightPanelTab === 'dashboard' ? '学习面板' : rightPanelTab === 'wrongbook' ? `错题本 (${wrongItems.length})` : '本题依据'}
            </strong>
            <div className="rp-header-actions">
              <button className={`rp-tab-btn ${rightPanelTab === 'dashboard' ? 'active' : ''}`} onClick={() => setRightPanelTab('dashboard')} title="学习面板"><Icon name="chart" size={15} /></button>
              <button className={`rp-tab-btn ${rightPanelTab === 'evidence' ? 'active' : ''}`} onClick={() => setRightPanelTab('evidence')} title="本题依据"><Icon name="eye" size={15} /></button>
              <button className={`rp-tab-btn ${rightPanelTab === 'wrongbook' ? 'active' : ''}`} onClick={() => setRightPanelTab('wrongbook')} title="错题本">
                <Icon name="book" size={15} />
                {wrongItems.length > 0 && <sup>{wrongItems.length}</sup>}
              </button>
              <button className="icon-btn right-panel-header-close" onClick={() => setRightPanelOpen(false)} aria-label="关闭"><Icon name="close" size={14} /></button>
            </div>
          </div>

          {rightPanelTab === 'dashboard' && (
            <DashboardTab stats={stats} chapterStats={chapterStats} wrongItems={wrongItems} goToGroup={goToGroup} openPanel={openPanel} />
          )}
          {rightPanelTab === 'evidence' && (
            <EvidenceTab item={current} progress={progress} />
          )}
          {rightPanelTab === 'wrongbook' && (
            <WrongBookTab wrongItems={wrongItems} goToGroup={goToGroup} />
          )}
        </aside>
      </div>

      {current && (
        <nav className="mobile-bottom-nav">
          <button className="mbn-item" onClick={toggleSidebar}>
            <span className="mbn-icon"><Icon name="menu" size={20} /></span>
            <span className="mbn-label">目录</span>
          </button>
          <button className="mbn-item" onClick={() => goTo(-1)} disabled={totalGroups <= 1} style={{ opacity: totalGroups <= 1 ? 0.3 : 1 }}>
            <span className="mbn-icon"><Icon name="left" size={20} /></span>
            <span className="mbn-label">上一组</span>
          </button>
          <button className="mbn-item" onClick={() => openPanel('dashboard')}>
            <span className="mbn-icon">
              <Icon name="chart" size={20} />
              {wrongItems.length > 0 && <span className="mbn-badge">{wrongItems.length}</span>}
            </span>
            <span className="mbn-label">{stats.pct}%</span>
          </button>
          <button className="mbn-item" onClick={() => goTo(1)} disabled={totalGroups <= 1} style={{ opacity: totalGroups <= 1 ? 0.3 : 1 }}>
            <span className="mbn-icon"><Icon name="right" size={20} /></span>
            <span className="mbn-label">下一组</span>
          </button>
        </nav>
      )}
    </div>
  )
}

function GroupJump({ current, total, onJump }) {
  const [value, setValue] = useState(String(current))

  function submitJump(event) {
    event.preventDefault()
    const requested = Number.parseInt(value, 10)
    const next = Number.isFinite(requested) ? Math.min(Math.max(requested, 1), total) : current
    setValue(String(next))
    onJump(next - 1)
  }

  return (
    <form className="group-jump" onSubmit={submitJump}>
      <span>跳至</span>
      <input type="number" inputMode="numeric" min="1" max={total} step="1" value={value} onChange={e => setValue(e.target.value)} aria-label={`跳转到第几组，当前范围共 ${total} 组`} />
      <span>/ {total} 组</span>
      <button type="submit">跳转</button>
    </form>
  )
}

function BTypeGroup({ item, progress, onMark }) {
  const { group } = item
  const [answers, setAnswers] = useState({})      // { [qid]: 'ABC' }
  const [submitted, setSubmitted] = useState({})  // { [qid]: true }

  const isMulti = q => (q.answer || '').length > 1

  const handleSelect = (qid, letter, multi) => {
    if (submitted[qid]) return
    setAnswers(prev => {
      const cur = prev[qid] || ''
      if (multi) {
        const next = cur.includes(letter) ? cur.replace(letter, '') : [...cur, letter].sort().join('')
        return { ...prev, [qid]: next }
      }
      return { ...prev, [qid]: cur === letter ? '' : letter }
    })
  }

  const handleSubmit = (qid, answer) => {
    const user = answers[qid] || ''
    setSubmitted(prev => ({ ...prev, [qid]: true }))
    onMark(qid, user === answer ? 'correct' : 'wrong')
  }

  const handleReset = (qid) => {
    setAnswers(prev => { const n = { ...prev }; delete n[qid]; return n })
    setSubmitted(prev => { const n = { ...prev }; delete n[qid]; return n })
    onMark(qid, null)
  }

  return (
    <div className="question-side">
      {group.questions.map((q, qi) => {
        const sel = answers[q.id] || ''
        const multi = isMulti(q)
        const isSubmitted = submitted[q.id]
        const isCorrect = isSubmitted && sel === q.answer
        const isWrong = isSubmitted && sel !== q.answer
        const status = progress[q.id]

        return (
          <div key={q.id} id={`q-${q.id}`} className={`q-card ${isCorrect ? 'correct' : ''} ${isWrong ? 'wrong' : ''}`}>
            <div className="q-header">
              <span className="q-num">{qi + 1}</span>
              <span className="q-text">{q.text}</span>
              <span className={`answer-mode ${multi ? 'is-multi' : ''}`}>{multi ? '多选' : '单选'}</span>
              {status === 'correct' && <span className="q-status correct"><Icon name="check" size={18} /></span>}
              {status === 'wrong' && <span className="q-status wrong"><Icon name="alert" size={18} /></span>}
            </div>

            <div className="q-body">
              <div className="answer-buttons">
                {group.sharedOptions.map(opt => {
                  const active = sel.includes(opt.id)
                  const isAnswer = isSubmitted && (q.answer || '').includes(opt.id)
                  const isMissed = isSubmitted && isAnswer && !active
                  return (
                    <button
                      key={opt.id}
                      className={`letter-btn ${active ? 'selected' : ''} ${isSubmitted && isAnswer ? 'answer' : ''} ${isMissed ? 'missed' : ''} ${isSubmitted && active && !isAnswer ? 'wrong' : ''}`}
                      onClick={() => handleSelect(q.id, opt.id, multi)}
                      disabled={isSubmitted}
                    >
                      <b>{opt.id}</b><span>{opt.text}</span>
                    </button>
                  )
                })}
              </div>

              {!isSubmitted && sel && (
                <button className="submit-btn" onClick={() => handleSubmit(q.id, q.answer)}>
                  提交答案 <Icon name="arrow" size={15} />
                </button>
              )}

              {isSubmitted && (
                <div className={`feedback ${isCorrect ? 'correct' : 'wrong'}`}>
                  {isCorrect ? (
                    <>✅ 正确！{q.note && <span className="feedback-note">（{q.note}）</span>}</>
                  ) : (
                    <>❌ 正确答案：{q.answer.split('').join('、')}{q.note && <span className="feedback-note">（{q.note}）</span>}</>
                  )}
                  <button className="retry-btn" onClick={() => handleReset(q.id)}>重做</button>
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function QAGroup({ sectionName, group, progress, onMark }) {
  return group.questions.map((q, qi) => (
    <QACard key={q.id} q={q} qi={qi} groupTitle={group.title} sectionName={sectionName} progress={progress} onMark={onMark} />
  ))
}

function QACard({ q, qi, sectionName, groupTitle, progress, onMark }) {
  const [revealed, setRevealed] = useState(false)
  const [selfCheck, setSelfCheck] = useState(null)
  const status = progress[q.id]

  const handleReveal = () => setRevealed(true)
  const handleSelfCheck = (result) => {
    setSelfCheck(result)
    onMark(q.id, result)
  }

  return (
    <div className={`q-card qa-card ${selfCheck === 'correct' ? 'correct' : ''} ${selfCheck === 'wrong' ? 'wrong' : ''}`} id={`q-${q.id}`}>
      <div className="q-header">
        <span className="q-num">{qi + 1}</span>
        <span className="q-text">{q.text}</span>
        {status === 'correct' && <span className="q-status correct"><Icon name="check" size={18} /></span>}
        {status === 'wrong' && <span className="q-status wrong"><Icon name="alert" size={18} /></span>}
      </div>
      <div className="q-body">
        {!revealed ? (
          <button className="reveal-btn" onClick={handleReveal}>点击查看答案</button>
        ) : (
          <div className="answer-section">
            <div className="answer-content">{q.answer}</div>
            {q.note && <div className="qa-note"><Icon name="alert" size={14} /><span>{q.note}</span></div>}
            {!selfCheck ? (
              <div className="self-check">
                <span>你答对了吗？</span>
                <button className="check-btn correct" onClick={() => handleSelfCheck('correct')}>✓ 答对了</button>
                <button className="check-btn wrong" onClick={() => handleSelfCheck('wrong')}>✗ 再记一下</button>
              </div>
            ) : (
              <div className="self-check-done">
                {selfCheck === 'correct' ? '✅ 已标记为掌握' : '📝 已标记为需复习'}
                <button className="retry-btn" onClick={() => { setRevealed(false); setSelfCheck(null); onMark(q.id, null) }}>重新来过</button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function DashboardTab({ stats, chapterStats, wrongItems, goToGroup, openPanel }) {
  return (
    <>
      <div className="rp-stats">
        <div className="rp-stat">
          <div className="rp-stat-val">{stats.answered}<span className="rp-stat-unit">/{stats.total}</span></div>
          <div className="rp-stat-label">已答</div>
        </div>
        <div className="rp-stat">
          <div className="rp-stat-val" style={{ color: 'var(--correct)' }}>{stats.correct}</div>
          <div className="rp-stat-label">正确</div>
        </div>
        <div className="rp-stat">
          <div className="rp-stat-val" style={{ color: stats.wrong > 0 ? 'var(--wrong)' : 'var(--text-secondary)' }}>{stats.wrong}</div>
          <div className="rp-stat-label">错题</div>
        </div>
      </div>
      <div className="rp-progress-bar-wrap">
        <div className="rp-progress-bar"><i style={{ width: `${stats.pct}%` }} /></div>
        <span className="rp-pct">{stats.pct}%</span>
      </div>

      <div className="rp-section-title">章节进度</div>
      {chapterStats.map(cs => (
        <div key={cs.name} className="rp-chapter">
          <div className="rp-chapter-header">
            <span className="rp-chapter-name">{cs.name}</span>
            <span className="rp-chapter-count">{cs.done}/{cs.total}</span>
          </div>
          <div className="rp-chapter-bar">
            <i style={{ width: `${cs.pct}%`, background: cs.pct >= 80 ? 'var(--correct)' : cs.pct >= 40 ? '#ed8936' : 'var(--border-strong)' }} />
          </div>
        </div>
      ))}

      {wrongItems.length > 0 && (
        <>
          <div className="rp-section-title">最近错题</div>
          {wrongItems.slice(-3).reverse().map((item, idx) => (
            <button key={idx} className="rp-wrong-item" onClick={() => goToGroup(item.sectionIdx, item.groupIdx, item.question.id)}>
              <span className="rp-wrong-sec">{item.sectionName}</span>
              <span className="rp-wrong-text">{item.question.text.substring(0, 35)}{item.question.text.length > 35 ? '…' : ''}</span>
            </button>
          ))}
        </>
      )}
    </>
  )
}

function EvidenceTab({ item, progress }) {
  if (!item) return <div className="rp-empty">打开一个题组查看依据</div>
  const { group, section } = item
  const isB = group.type === 'b_type'
  const resultCount = isB ? group.questions.filter(q => progress[q.id] === 'correct').length : 0
  const answeredCount = isB ? group.questions.filter(q => progress[q.id]).length : 0
  const pdfName = group.pdf === 'down' ? 'pdf/physio-down.pdf' : 'pdf/physio-up.pdf'
  const pdfPage = group.pdfPage || 1
  const pdfSrc = `${pdfName}#page=${pdfPage}`
  const [pdfZoom, setPdfZoom] = useState(false)

  return (
    <div className="evidence-body">
      <div className="evidence-section">
        <div className="evidence-title">
          <span className="evidence-icon"><Icon name="check" size={18} /></span>
          <div><h2>本题依据</h2><p>{section.name} · {kindLabel(group)} · 共 {group.questions.length} 问</p></div>
          <span className="verified-dot"><Icon name="check" size={13} /></span>
        </div>
        <div className="evidence-facts">
          <div className="source-line"><span>章节</span><strong>{section.name}</strong></div>
          <div className="source-line"><span>题型</span><strong>{kindLabel(group)}</strong></div>
          <div className="source-line"><span>原题页</span><strong>{group.sourcePage ? `第 ${group.sourcePage} 页` : `PDF 第 ${pdfPage} 页`}</strong></div>
          <div className="source-line"><span>来源</span><strong>{group.pdf === 'down' ? '天门提问·下册' : '天门带背·上册'}</strong></div>
        </div>
      </div>

      <div className="evidence-section">
        <div className="evidence-title">
          <span className="evidence-icon"><Icon name="file" size={18} /></span>
          <div><h2>原题 PDF</h2><p>{group.title} · 第 {pdfPage} 页</p></div>
          <button className="pdf-zoom-btn" onClick={() => setPdfZoom(true)} title="放大查看">
            <Icon name="zoom" size={15} /> 放大
          </button>
        </div>
        <div className="evidence-pdf">
          <iframe
            src={pdfSrc}
            title={`原题 PDF 第 ${pdfPage} 页`}
            loading="lazy"
          />
          <div className="evidence-pdf-catcher" onClick={() => setPdfZoom(true)} role="button" aria-label="放大查看 PDF" />
        </div>
        <p className="pdf-hint">点击 PDF 或「放大」按钮全屏查看，支持双指/滚轮缩放。</p>
      </div>

      {isB && answeredCount > 0 && (
        <div className={`rp-summary-card ${resultCount === group.questions.length ? 'ok' : ''}`}>
          <Icon name={resultCount === group.questions.length ? 'check' : 'alert'} size={16} />
          <span>本组正确 {resultCount} / {group.questions.length}</span>
        </div>
      )}

      {pdfZoom && createPortal(
        <div className="pdf-zoom-overlay" onClick={() => setPdfZoom(false)}>
          <div className="pdf-zoom-box" onClick={e => e.stopPropagation()}>
            <div className="pdf-zoom-header">
              <strong>{group.title} · 第 {pdfPage} 页</strong>
              <button className="pdf-zoom-close" onClick={() => setPdfZoom(false)} aria-label="关闭"><Icon name="close" size={18} /></button>
            </div>
            <iframe src={pdfSrc} title={`放大查看 ${group.title}`} />
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}

function WrongBookTab({ wrongItems, goToGroup }) {
  if (wrongItems.length === 0) {
    return <div className="rp-empty">暂无错题 🎉</div>
  }
  return (
    <div className="wrong-book-list">
      {wrongItems.map((item, idx) => (
        <button key={`${item.question.id}-${idx}`} className="wrong-item-btn" onClick={() => goToGroup(item.sectionIdx, item.groupIdx, item.question.id)}>
          <span className="wrong-item-section">{item.sectionName}</span>
          <span className="wrong-item-title">{item.groupTitle}</span>
          <span className="wrong-item-q">Q{item.qi + 1}: {item.question.text.substring(0, 40)}{item.question.text.length > 40 ? '…' : ''}</span>
          {item.question.answer && <span className="wrong-item-answer">答案: {item.question.answer}</span>}
        </button>
      ))}
    </div>
  )
}

import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import quizData from './data'

const STORAGE_KEY = 'xizong-tiku-progress'

function loadProgress() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved ? JSON.parse(saved) : {}
  } catch { return {} }
}

function saveProgress(p) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(p))
}

export default function App() {
  const [sectionIdx, setSectionIdx] = useState(0)
  const [groupIdx, setGroupIdx] = useState(0)
  const [progress, setProgress] = useState(loadProgress)
  const [searchQuery, setSearchQuery] = useState('')
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('xizong-dark') === '1'
  })
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    return window.innerWidth >= 769
  })
  const [rightPanelOpen, setRightPanelOpen] = useState(() => {
    return window.innerWidth >= 769
  })
  const [filterType, setFilterType] = useState('all')
  const [rightPanelTab, setRightPanelTab] = useState('dashboard')
  const [scrollToQid, setScrollToQid] = useState(null)
  const contentRef = useRef(null)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode)
    localStorage.setItem('xizong-dark', darkMode ? '1' : '0')
  }, [darkMode])

  // Scroll to question after navigation
  useEffect(() => {
    if (scrollToQid) {
      // Small delay to let React re-render new group
      const timer = setTimeout(() => {
        const el = document.getElementById(`q-${scrollToQid}`)
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' })
          el.classList.add('highlight-flash')
          setTimeout(() => {
            el.classList.remove('highlight-flash')
          }, 1200)
        }
        setScrollToQid(null)
      }, 150)
      return () => clearTimeout(timer)
    }
  }, [scrollToQid, sectionIdx, groupIdx])

  const sections = quizData.sections

  // Flatten all groups for navigation
  const allGroups = useMemo(() => {
    const result = []
    sections.forEach((section, si) => {
      section.groups.forEach((group, gi) => {
        result.push({ sectionIdx: si, groupIdx: gi, section, group })
      })
    })
    return result
  }, [sections])

  // Filter groups by search
  const filteredGroups = useMemo(() => {
    const q = searchQuery.toLowerCase()
    return allGroups.filter(({ group }) => {
      if (filterType !== 'all' && group.type !== filterType) return false
      if (!q) return true
      return group.questions.some(qq =>
        qq.text.toLowerCase().includes(q) ||
        (qq.answer && qq.answer.toLowerCase().includes(q))
      ) || (group.sharedOptions || []).some(o => o.text.toLowerCase().includes(q)) ||
        group.title.toLowerCase().includes(q)
    })
  }, [allGroups, searchQuery, filterType])

  // Current group
  const currentGroup = sections[sectionIdx]?.groups[groupIdx]

  const goToGroup = useCallback((si, gi, qid) => {
    setSectionIdx(si)
    setGroupIdx(gi)
    setSidebarOpen(false)
    if (qid) {
      setScrollToQid(qid)
    }
  }, [])

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
      const next = { ...prev, [qid]: status }
      saveProgress(next)
      return next
    })
  }, [])

  // Stats
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

  // Wrong book items
  const wrongItems = useMemo(() => {
    const items = []
    allGroups.forEach(({ sectionIdx: si, groupIdx: gi, section, group }) => {
      group.questions.forEach((q, qi) => {
        if (progress[q.id] === 'wrong') {
          items.push({ sectionIdx: si, groupIdx: gi, sectionName: section.name, groupTitle: group.title, question: q, qi })
        }
      })
    })
    return items
  }, [allGroups, progress])

  // Chapter stats
  const chapterStats = useMemo(() => {
    return sections.map((section, si) => {
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

  // Current position for bottom nav
  const currentPos = allGroups.findIndex(g => g.sectionIdx === sectionIdx && g.groupIdx === groupIdx)
  const canGoPrev = !searchQuery && currentPos > 0
  const canGoNext = !searchQuery && currentPos < allGroups.length - 1

  const handlePrev = () => {
    if (canGoPrev) goToGroup(allGroups[currentPos - 1].sectionIdx, allGroups[currentPos - 1].groupIdx)
  }
  const handleNext = () => {
    if (canGoNext) goToGroup(allGroups[currentPos + 1].sectionIdx, allGroups[currentPos + 1].groupIdx)
  }

  const drawerOpen = sidebarOpen || rightPanelOpen

  return (
    <div className={`app ${darkMode ? 'dark' : ''}`}>
      {/* Overlay for mobile drawers */}
      <div className={`overlay ${drawerOpen ? 'show' : ''}`} onClick={closeAllDrawers} />

      {/* Top bar */}
      <header className="topbar">
        <div className="topbar-left">
          <button className="menu-btn" onClick={toggleSidebar} aria-label="目录">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
          </button>
          <div className="brand" onClick={() => goToGroup(0, 0)} title="回到首页">
            <div className="brand-logo">🫀</div>
            <div className="brand-text">
              <span className="brand-title">天天带背</span>
              <span className="brand-sub">生理 · 血液循环</span>
            </div>
          </div>
        </div>

        <div className="topbar-center">
          <div className="search-wrap">
            <svg className="search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            <input
              placeholder="搜索题目 / 关键词"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="topbar-right">
          <select className="filter-select" value={filterType} onChange={e => setFilterType(e.target.value)}>
            <option value="all">全部</option>
            <option value="b_type">B型题</option>
            <option value="qa">问答题</option>
          </select>

          <div className="progress-strip" onClick={() => { setRightPanelOpen(true); setRightPanelTab('dashboard') }} title="打开学习面板">
            <strong>{stats.answered}/{stats.total}</strong>
            <div className="progress-bar"><i style={{ width: `${stats.pct}%` }} /></div>
            <span>{stats.pct}%</span>
          </div>

          <button className="icon-btn" onClick={toggleRightPanel} title="学习面板" aria-label="学习面板">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/></svg>
          </button>
          <button className="icon-btn" onClick={() => { setRightPanelOpen(true); setRightPanelTab('wrongbook') }} title="错题本" aria-label="错题本">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/></svg>
            {wrongItems.length > 0 && <sup>{wrongItems.length}</sup>}
          </button>
          <button className="icon-btn" onClick={() => setDarkMode(!darkMode)} title="切换暗色模式" aria-label="切换暗色模式">
            {darkMode ? '☀️' : '🌙'}
          </button>
        </div>
      </header>

      <div className="layout">
        {/* Sidebar */}
        <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
          <div className="sidebar-header">
            <strong>章节目录</strong>
            <button className="icon-btn" onClick={() => setSidebarOpen(false)} aria-label="关闭">✕</button>
          </div>
          <div className="sidebar-content">
            {searchQuery && <div className="search-results-count">搜索到 {filteredGroups.length} 组</div>}
            <nav>
              {sections.map((section, si) => (
                <div key={si} className="section-nav">
                  <div className="section-title">{section.name}</div>
                  {section.groups.map((group, gi) => {
                    const isActive = si === sectionIdx && gi === groupIdx
                    const done = group.questions.filter(q => progress[q.id] === 'correct').length
                    return (
                      <button
                        key={gi}
                        className={`group-nav-btn ${isActive ? 'active' : ''}`}
                        onClick={() => goToGroup(si, gi)}
                      >
                        <span className={`type-badge ${group.type}`}>
                          {group.type === 'b_type' ? 'B型' : '问答'}
                        </span>
                        <span className="group-nav-title">{group.title}</span>
                        <span className="group-nav-progress">{done}/{group.questions.length}</span>
                      </button>
                    )
                  })}
                </div>
              ))}
            </nav>
          </div>

          {/* Sidebar learning stats footer */}
          <div className="sidebar-footer">
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
            <div className="sf-progress-bar">
              <i style={{ width: `${stats.pct}%` }} />
            </div>
            <div className="sf-actions">
              <button
                className="sf-action-btn"
                onClick={() => { setRightPanelOpen(true); setRightPanelTab('dashboard'); setSidebarOpen(false) }}
              >
                📊 学习面板
              </button>
              <button
                className="sf-action-btn sf-wrong-btn"
                onClick={() => { setRightPanelOpen(true); setRightPanelTab('wrongbook'); setSidebarOpen(false) }}
              >
                📕 错题本 {wrongItems.length > 0 && <span className="sf-badge">{wrongItems.length}</span>}
              </button>
            </div>
          </div>
        </aside>

        {/* Main content */}
        <main className="content">
          {searchQuery && filteredGroups.length === 0 ? (
            <div className="empty-state">没有找到匹配的题目</div>
          ) : searchQuery ? (
            // Search results
            filteredGroups.map(({ sectionIdx: si, groupIdx: gi, section, group }) => (
              <QuestionGroup
                key={`${si}-${gi}`}
                sectionName={section.name}
                group={group}
                progress={progress}
                onMark={markQuestion}
              />
            ))
          ) : currentGroup ? (
            <QuestionGroup
              sectionName={sections[sectionIdx].name}
              group={currentGroup}
              progress={progress}
              onMark={markQuestion}
            />
          ) : null}

          {/* Navigation arrows (desktop/tablet) */}
          {!searchQuery && (
            <div className="nav-footer">
              <button className="nav-btn" disabled={!canGoPrev} onClick={handlePrev}>
                ← 上一组
              </button>
              <span className="nav-pos">{currentPos + 1} / {allGroups.length}</span>
              <button className="nav-btn" disabled={!canGoNext} onClick={handleNext}>
                下一组 →
              </button>
            </div>
          )}
        </main>

        {/* Right panel */}
        <aside className={`right-panel ${rightPanelOpen ? 'open' : ''}`}>
          {rightPanelTab === 'dashboard' ? (
            <>
              <div className="rp-header">
                <strong>📊 学习面板</strong>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button className="icon-btn" onClick={() => setRightPanelTab('wrongbook')} title="查看错题本">
                    📕{wrongItems.length > 0 && <sup>{wrongItems.length}</sup>}
                  </button>
                  <button className="icon-btn right-panel-header-close" onClick={() => setRightPanelOpen(false)} aria-label="关闭">✕</button>
                </div>
              </div>
              
              {/* Overall stats */}
              <div className="rp-stats">
                <div className="rp-stat">
                  <div className="rp-stat-val">{stats.answered}<span className="rp-stat-unit">/{stats.total}</span></div>
                  <div className="rp-stat-label">已答</div>
                </div>
                <div className="rp-stat">
                  <div className="rp-stat-val" style={{color: 'var(--correct)'}}>{stats.correct}</div>
                  <div className="rp-stat-label">正确</div>
                </div>
                <div className="rp-stat">
                  <div className="rp-stat-val" style={{color: stats.wrong > 0 ? 'var(--wrong)' : 'var(--text-secondary)'}}>{stats.wrong}</div>
                  <div className="rp-stat-label">错题</div>
                </div>
              </div>
              
              <div className="rp-progress-bar-wrap">
                <div className="rp-progress-bar">
                  <i style={{width: `${stats.pct}%`}} />
                </div>
                <span className="rp-pct">{stats.pct}%</span>
              </div>

              {/* Chapter progress */}
              <div className="rp-section-title">章节进度</div>
              {chapterStats.map(cs => (
                <div key={cs.name} className="rp-chapter">
                  <div className="rp-chapter-header">
                    <span className="rp-chapter-name">{cs.name}</span>
                    <span className="rp-chapter-count">{cs.done}/{cs.total}</span>
                  </div>
                  <div className="rp-chapter-bar">
                    <i style={{width: `${cs.pct}%`, background: cs.pct >= 80 ? 'var(--correct)' : cs.pct >= 40 ? '#ed8936' : 'var(--border)'}} />
                  </div>
                </div>
              ))}

              {/* Recent wrong items */}
              {wrongItems.length > 0 && (
                <>
                  <div className="rp-section-title">最近错题</div>
                  {wrongItems.slice(-3).reverse().map((item, idx) => (
                    <button
                      key={idx}
                      className="rp-wrong-item"
                      onClick={() => { goToGroup(item.sectionIdx, item.groupIdx, item.question.id); setRightPanelOpen(false) }}
                    >
                      <span className="rp-wrong-sec">{item.sectionName}</span>
                      <span className="rp-wrong-text">{item.question.text.substring(0, 35)}…</span>
                    </button>
                  ))}
                </>
              )}
            </>
          ) : (
            <>
              <div className="rp-header">
                <strong>📕 错题本 ({wrongItems.length})</strong>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button className="icon-btn" onClick={() => setRightPanelTab('dashboard')}>📊</button>
                  <button className="icon-btn" onClick={() => setRightPanelOpen(false)} aria-label="关闭">✕</button>
                </div>
              </div>
              {wrongItems.length === 0 ? (
                <div className="rp-empty">暂无错题 🎉</div>
              ) : (
                <div className="wrong-book-list">
                  {wrongItems.map((item, idx) => (
                    <button
                      key={`${item.question.id}-${idx}`}
                      className="wrong-item-btn"
                      onClick={() => { goToGroup(item.sectionIdx, item.groupIdx, item.question.id); setRightPanelOpen(false) }}
                    >
                      <span className="wrong-item-section">{item.sectionName}</span>
                      <span className="wrong-item-title">{item.groupTitle}</span>
                      <span className="wrong-item-q">Q{item.qi + 1}: {item.question.text.substring(0, 40)}{item.question.text.length > 40 ? '…' : ''}</span>
                      {item.question.answer && <span className="wrong-item-answer">答案: {item.question.answer}</span>}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </aside>
      </div>

      {/* Mobile Bottom Navigation */}
      {!searchQuery && (
        <nav className="mobile-bottom-nav">
          <button className="mbn-item" onClick={toggleSidebar}>
            <span className="mbn-icon">📋</span>
            <span className="mbn-label">目录</span>
          </button>
          <button className={`mbn-item ${!canGoPrev ? 'disabled' : ''}`} onClick={handlePrev} disabled={!canGoPrev} style={{ opacity: canGoPrev ? 1 : 0.3 }}>
            <span className="mbn-icon">⬅️</span>
            <span className="mbn-label">上一组</span>
          </button>
          <button className="mbn-item" onClick={toggleRightPanel}>
            <span className="mbn-icon">
              📊
              {wrongItems.length > 0 && <span className="mbn-badge">{wrongItems.length}</span>}
            </span>
            <span className="mbn-label">{stats.pct}%</span>
          </button>
          <button className={`mbn-item ${!canGoNext ? 'disabled' : ''}`} onClick={handleNext} disabled={!canGoNext} style={{ opacity: canGoNext ? 1 : 0.3 }}>
            <span className="mbn-icon">➡️</span>
            <span className="mbn-label">下一组</span>
          </button>
        </nav>
      )}
    </div>
  )
}

function QuestionGroup({ sectionName, group, progress, onMark }) {
  if (group.type === 'b_type') {
    return <BTypeGroup sectionName={sectionName} group={group} progress={progress} onMark={onMark} />
  }
  return <QAGroup sectionName={sectionName} group={group} progress={progress} onMark={onMark} />
}

function BTypeGroup({ sectionName, group, progress, onMark }) {
  const [answers, setAnswers] = useState({})
  const [submitted, setSubmitted] = useState({})
  const railRef = useRef(null)
  const gridRef = useRef(null)

  // 悬浮选项面板：跟随 study-grid 的左栏位置，滚动时固定可见
  useEffect(() => {
    const rail = railRef.current
    const grid = gridRef.current
    if (!rail || !grid) return

    const update = () => {
      // 移动端：恢复静态布局
      if (window.innerWidth <= 768) {
        rail.style.cssText = ''
        return
      }
      const placeholder = grid.querySelector('.option-rail-placeholder')
      const anchor = placeholder || grid
      const rect = anchor.getBoundingClientRect()
      const topbarH = 72
      const gap = 16
      const top = topbarH + gap
      const maxH = window.innerHeight - top - gap
      rail.style.left = `${rect.left}px`
      rail.style.top = `${top}px`
      rail.style.width = `${rect.width}px`
      rail.style.maxHeight = `${maxH}px`
    }

    update()
    // 监听内容区滚动（.content 是滚动容器）+ 窗口缩放 + grid 尺寸变化（侧栏开合）
    const scroller = document.querySelector('.content')
    scroller?.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    window.addEventListener('scroll', update, { passive: true })
    const ro = new ResizeObserver(update)
    ro.observe(grid)
    return () => {
      scroller?.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
      window.removeEventListener('scroll', update)
      ro.disconnect()
    }
  }, [])

  const handleSelect = (qid, letter) => {
    if (submitted[qid]) return
    setAnswers(prev => {
      const current = prev[qid] || ''
      if (current.includes(letter)) {
        return { ...prev, [qid]: current.replace(letter, '') }
      }
      const newVal = (current + letter).split('').sort().join('')
      return { ...prev, [qid]: newVal }
    })
  }

  const handleSubmit = (qid, correctAnswer) => {
    const userAns = answers[qid] || ''
    const isCorrect = userAns === correctAnswer
    setSubmitted(prev => ({ ...prev, [qid]: true }))
    onMark(qid, isCorrect ? 'correct' : 'wrong')
  }

  const handleReset = (qid) => {
    setAnswers(prev => {
      const next = { ...prev }
      delete next[qid]
      return next
    })
    setSubmitted(prev => {
      const next = { ...prev }
      delete next[qid]
      return next
    })
    onMark(qid, null)
  }

  return (
    <div className="question-group">
      <div className="group-header">
        <span className="section-badge">{sectionName}</span>
        <span className="type-badge b_type">B型题</span>
        <span className="source-page">原题第{group.sourcePage}页</span>
      </div>
      <h2 className="group-title">{group.title}</h2>
      <p className="group-hint">每个题干独立作答，提交后逐题反馈。</p>

      <div className="study-grid" ref={gridRef}>
        {/* 占位元素：保持 grid 第一列宽度，fixed 面板以其为定位锚点 */}
        <div className="option-rail-placeholder" aria-hidden="true" />
        <div className="option-rail" ref={railRef}>
          <div className="option-bank">
            <div className="section-label">共用选项 <em>{group.sharedOptions.length} 项</em></div>
            <div className="option-grid">
              {group.sharedOptions.map(opt => (
                <div key={opt.id} className="shared-option">
                  <b>{opt.id}</b>
                  <span>{opt.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="question-side">
          {group.questions.map((q, qi) => {
            const userAns = answers[q.id] || ''
            const isSubmitted = submitted[q.id]
            const isCorrect = isSubmitted && userAns === q.answer
            const isWrong = isSubmitted && userAns !== q.answer
            const status = progress[q.id]

            return (
              <div key={q.id} id={`q-${q.id}`} className={`q-card ${isCorrect ? 'correct' : ''} ${isWrong ? 'wrong' : ''}`}>
                <div className="q-header">
                  <span className="q-num">{qi + 1}</span>
                  <span className="q-text">{q.text}</span>
                  {status === 'correct' && <span className="q-status correct">✓</span>}
                  {status === 'wrong' && <span className="q-status wrong">✗</span>}
                </div>

                <div className="q-body">
                  <div className="answer-buttons">
                    {group.sharedOptions.map(opt => (
                      <button
                        key={opt.id}
                        className={`letter-btn ${userAns.includes(opt.id) ? 'selected' : ''}`}
                        onClick={() => handleSelect(q.id, opt.id)}
                        disabled={isSubmitted}
                        title={opt.text}
                      >
                        {opt.id}
                      </button>
                    ))}
                  </div>

                  {!isSubmitted && userAns && (
                    <button className="submit-btn" onClick={() => handleSubmit(q.id, q.answer)}>
                      提交答案
                    </button>
                  )}

                  {isSubmitted && (
                    <div className={`feedback ${isCorrect ? 'correct' : 'wrong'}`}>
                      {isCorrect ? '✅ 正确！' : `❌ 你的答案: ${userAns}，正确答案: ${q.answer}`}
                      {q.note && <span className="feedback-note">（{q.note}）</span>}
                      <button className="retry-btn" onClick={() => handleReset(q.id)}>重做</button>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function QAGroup({ sectionName, group, progress, onMark }) {
  return (
    <div className="question-group">
      <div className="group-header">
        <span className="section-badge">{sectionName}</span>
        <span className="type-badge qa">问答题</span>
      </div>
      <h2 className="group-title">{group.title}</h2>

      {group.questions.map((q, qi) => (
        <QACard key={q.id} q={q} qi={qi} progress={progress} onMark={onMark} />
      ))}
    </div>
  )
}

function QACard({ q, qi, progress, onMark }) {
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
        {status === 'correct' && <span className="q-status correct">✓</span>}
        {status === 'wrong' && <span className="q-status wrong">✗</span>}
      </div>

      <div className="q-body">
        {!revealed ? (
          <button className="reveal-btn" onClick={handleReveal}>点击查看答案</button>
        ) : (
          <div className="answer-section">
            <div className="answer-content">{q.answer}</div>
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

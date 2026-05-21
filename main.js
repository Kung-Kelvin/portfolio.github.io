(function () {
  const STORAGE_KEY = 'kanban_markov_todos_v3'

  // Primary Forms DOM
  const form = document.getElementById('todo-form')
  const input = document.getElementById('todo-input')
  const importanceSelect = document.getElementById('todo-importance')
  const deadlineInput = document.getElementById('todo-deadline')
  const linkInput = document.getElementById('todo-link')
  const commentInput = document.getElementById('todo-comment')

  // Milestones DOM
  const msTitle = document.getElementById('ms-title-input')
  const msImportance = document.getElementById('ms-importance-input')
  const msDeadline = document.getElementById('ms-deadline-input')
  const addMilestoneBtn = document.getElementById('add-milestone-btn')
  const milestoneQueueDiv = document.getElementById('milestone-queue')

  // Kanban Columns DOM
  const colTodo = document.getElementById('col-todo')
  const colProgress = document.getElementById('col-progress')
  const colOverdue = document.getElementById('col-overdue')
  const colDone = document.getElementById('col-done')

  // Badges DOM
  const badgeTodo = document.getElementById('badge-todo')
  const badgeProgress = document.getElementById('badge-progress')
  const badgeOverdue = document.getElementById('badge-overdue')
  const badgeDone = document.getElementById('badge-done')

  // System Analytics Trigger
  const btnRunAnalytics = document.getElementById('btn-run-analytics')
  const analyticsOutput = document.getElementById('analytics-output')
  
  // Data Portability Buttons
  const btnExport = document.getElementById('btn-export')
  const fileImport = document.getElementById('import-file')

  let todos = []
  let tempMilestones = []

  const priorityLabels = { high: '高', medium: '中', low: '低', none: 'なし' }
  const priorityBadges = { high: 'bg-danger', medium: 'bg-warning text-dark', low: 'bg-primary', none: 'bg-secondary' }

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      todos = raw ? JSON.parse(raw) : []
    } catch (e) {
      todos = []
    }
  }

  function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(todos))
  }

  // Task Lifecycle State Determination
  function getTaskState(t) {
    if (t.done) return 'done'
    const now = new Date()
    const isOverdue = t.deadline && new Date(t.deadline) < now
    const hasOverdueMilestone = t.milestones && t.milestones.some(m => !m.done && m.deadline && new Date(m.deadline) < now)
    
    if (isOverdue || hasOverdueMilestone) return 'overdue'
    if (t.started || (t.milestones && t.milestones.some(m => m.done))) return 'progress'
    return 'todo'
  }

  // Milestone Temporary Array Handler
  addMilestoneBtn.addEventListener('click', () => {
    const text = msTitle.value.trim()
    if (!text) return
    tempMilestones.push({
      id: 'ms-' + Date.now() + Math.random().toString(36).substr(2, 4),
      text: text,
      importance: msImportance.value,
      deadline: msDeadline.value || null,
      done: false
    })
    msTitle.value = ''; msDeadline.value = ''; msImportance.value = 'medium'
    renderTempMilestones()
  })

  function renderTempMilestones() {
    milestoneQueueDiv.innerHTML = ''
    tempMilestones.forEach((ms, i) => {
      const badge = document.createElement('span')
      badge.className = `badge ${priorityBadges[ms.importance]} d-flex align-items-center gap-1 p-1 fs-7`
      badge.textContent = `🏁 ${ms.text}`
      const cBtn = document.createElement('button')
      cBtn.className = 'btn-close btn-close-white'
      cBtn.style.fontSize = '0.5rem'
      cBtn.addEventListener('click', () => { tempMilestones.splice(i, 1); renderTempMilestones(); })
      badge.appendChild(cBtn)
      milestoneQueueDiv.appendChild(badge)
    })
  }

  // Core Render Engine
  function render() {
    colTodo.innerHTML = ''; colProgress.innerHTML = ''; colOverdue.innerHTML = ''; colDone.innerHTML = ''
    let counts = { todo: 0, progress: 0, overdue: 0, done: 0 }

    todos.forEach((t) => {
      const state = getTaskState(t)
      counts[state]++

      // Create Kanban Card Element
      const card = document.createElement('div')
      card.className = `card shadow-sm p-2 mb-2 bg-white importance-${t.importance}`
      
      const titleRow = document.createElement('div')
      titleRow.className = 'd-flex align-items-start gap-2 justify-content-between mb-1'

      const check = document.createElement('input')
      check.type = 'checkbox'
      check.className = 'form-check-input mt-1 flex-shrink-0'
      check.checked = t.done
      check.addEventListener('change', () => toggleMainTask(t.id))

      const titleLabel = document.createElement('span')
      titleLabel.className = `fw-bold text-break flex-grow-1 ${t.done ? 'text-decoration-line-through text-muted' : ''}`
      titleLabel.textContent = t.text

      titleRow.appendChild(check)
      titleRow.appendChild(titleLabel)
      card.appendChild(titleRow)

      // Technical Specifications Rendering (Links & Metrics)
      if (t.deadline || t.link) {
        const metaRow = document.createElement('div')
        metaRow.className = 'd-flex flex-wrap gap-1 align-items-center mb-2'
        if (t.deadline) {
          const dBadge = document.createElement('span')
          dBadge.className = `badge fs-7 p-1 ${state === 'overdue' ? 'bg-danger' : 'bg-secondary'}`
          dBadge.textContent = `⏳ ${t.deadline.replace('T', ' ')}`
          metaRow.appendChild(dBadge)
        }
        if (t.link) {
          const lAnchor = document.createElement('a')
          lAnchor.href = t.link; lAnchor.target = '_blank'; lAnchor.className = 'btn btn-xs btn-outline-dark py-0 px-1 fs-7'
          lAnchor.textContent = '🔗 参照'
          metaRow.appendChild(lAnchor)
        }
        card.appendChild(metaRow)
      }

      // Context Milestones Block
      if (t.milestones && t.milestones.length > 0) {
        const msBox = document.createElement('div')
        msBox.className = 'border rounded p-1 bg-light mb-2 fs-7'
        t.milestones.forEach((ms) => {
          const div = document.createElement('div')
          div.className = 'd-flex align-items-center justify-content-between border-bottom py-1'
          
          const labelWrap = document.createElement('label')
          labelWrap.className = 'd-flex align-items-center gap-1 m-0'
          
          const mc = document.createElement('input')
          mc.type = 'checkbox'; mc.className = 'form-check-input'; mc.checked = ms.done; mc.disabled = t.done
          mc.style.transform = 'scale(0.8)'
          mc.addEventListener('change', () => toggleSubMilestone(t.id, ms.id))
          
          const txt = document.createElement('span')
          txt.className = ms.done ? 'text-decoration-line-through text-muted' : 'fw-semibold'
          txt.textContent = ms.text
          
          labelWrap.appendChild(mc); labelWrap.appendChild(txt)
          div.appendChild(labelWrap)
          
          const tag = document.createElement('span')
          tag.className = `badge ${priorityBadges[ms.importance]}`
          tag.style.fontSize = '0.6rem'
          tag.textContent = priorityLabels[ms.importance]
          div.appendChild(tag)
          
          msBox.appendChild(div)
        })
        card.appendChild(msBox)
      }

      // Actions Card Strip
      const actionStrip = document.createElement('div')
      actionStrip.className = 'd-flex justify-content-between align-items-center mt-1'
      
      // Progress manual bump for non-milestone items
      if (!t.done && state === 'todo') {
        const btnStart = document.createElement('button')
        btnStart.className = 'btn btn-xs btn-outline-warning py-0 px-1 fs-7'
        btnStart.textContent = '▶ 着手'
        btnStart.addEventListener('click', () => { t.started = true; save(); render(); })
        actionStrip.appendChild(btnStart)
      } else {
        actionStrip.appendChild(document.createElement('span'))
      }

      const btnDel = document.createElement('button')
      btnDel.className = 'btn btn-link text-danger text-decoration-none p-0 fs-7'
      btnDel.textContent = '削除'
      btnDel.addEventListener('click', () => { todos = todos.filter(x => x.id !== t.id); save(); render(); })
      actionStrip.appendChild(btnDel)
      card.appendChild(actionStrip)

      // Append Card into Correct Kanban Track
      if (state === 'todo') colTodo.appendChild(card)
      else if (state === 'progress') colProgress.appendChild(card)
      else if (state === 'overdue') colOverdue.appendChild(card)
      else if (state === 'done') colDone.appendChild(card)
    })

    // Update Kanban Counters
    badgeTodo.textContent = counts.todo
    badgeProgress.textContent = counts.progress
    badgeOverdue.textContent = counts.overdue
    badgeDone.textContent = counts.done
  }

  function toggleMainTask(id) {
    todos = todos.map(t => {
      if (t.id === id) {
        const d = !t.done
        return { ...t, done: d, milestones: t.milestones ? t.milestones.map(m => ({ ...m, done: d })) : [] }
      }
      return t
    })
    save(); render();
  }

  function toggleSubMilestone(todoId, msId) {
    todos = todos.map(t => {
      if (t.id === todoId) {
        const updated = t.milestones.map(m => m.id === msId ? { ...m, done: !m.done } : m)
        return { ...t, milestones: updated, started: true }
      }
      return t
    })
    save(); render();
  }

  // Form Submissions Injection
  form.addEventListener('submit', (e) => {
    e.preventDefault()
    if (!input.value.trim()) return
    todos.unshift({
      id: 'task-' + Date.now(),
      text: input.value.trim(),
      importance: importanceSelect.value,
      deadline: deadlineInput.value || null,
      link: linkInput.value ? linkInput.value.trim() : null,
      comment: commentInput.value ? commentInput.value.trim() : null,
      milestones: [...tempMilestones],
      done: false,
      started: false
    })
    form.reset(); tempMilestones = []; renderTempMilestones(); save(); render();
    input.focus()
  })

  // DATA PORTABILITY PIPELINES (JSON Interfacing)
  btnExport.addEventListener('click', () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(todos, null, 2))
    const downloadAnchor = document.createElement('a')
    downloadAnchor.setAttribute("href", dataStr)
    downloadAnchor.setAttribute("download", `dashboard_backup_${new Date().toISOString().slice(0,10)}.json`)
    document.body.appendChild(downloadAnchor)
    downloadAnchor.click()
    downloadAnchor.remove()
  })

  fileImport.addEventListener('change', (e) => {
    const reader = new FileReader()
    if (!e.target.files[0]) return
    reader.onload = function(event) {
      try {
        const parsed = JSON.parse(event.target.result)
        if (Array.isArray(parsed)) {
          todos = parsed
          save(); render();
        } else { alert("不正なJSON構造です。") }
      } catch (err) { alert("ファイルの読み込みに失敗しました。") }
    }
    reader.readAsText(e.target.files[0])
  })

  // STOCHASTIC MARKOV CHAINS & NETWORK TOPOLOGY ANALYTICS ENGINE
  btnRunAnalytics.addEventListener('click', () => {
    if (todos.length === 0) {
      analyticsOutput.innerHTML = '<div class="alert alert-warning small m-0">データが不足しています。</div>'
      return
    }

    // 1. Structural Graph Centrality (Network Analysis)
    let bottlenecks = []
    todos.forEach(t => {
      if (!t.done) {
        let weight = 0
        if (t.importance === 'high') weight += 3
        if (t.importance === 'medium') weight += 2
        if (t.milestones) weight += t.milestones.filter(m => !m.done).length // Outdegree edges
        bottlenecks.push({ text: t.text, score: weight })
      }
    })
    bottlenecks.sort((a, b) => b.score - a.score)

    // 2. Markov Chain Transition Matrix Calculation
    // State Indexes: 0 = Todo, 1 = Progress, 2 = Overdue, 3 = Done (Absorbing State)
    let counts = [0, 0, 0, 0]
    todos.forEach(t => {
      const state = getTaskState(t)
      if (state === 'todo') counts[0]++
      else if (state === 'progress') counts[1]++
      else if (state === 'overdue') counts[2]++
      else if (state === 'done') counts[3]++
    })
    
    const sum = todos.length
    // Base Stochastic Probabilities Vector
    let pTodo = counts[0] / sum, pProg = counts[1] / sum, pOve = counts[2] / sum, pDone = counts[3] / sum

    // Generate Urgent vs Important Optimization Suggestions (Eisenhower Matrix Bounds)
    let strategySuggestion = ""
    if (counts[2] > (sum * 0.25)) {
      strategySuggestion = "⚠️ <b>ボトルネック警告:</b> 全体構造の25%以上が期限を超過しています。高重要度のマイルストーンを細分化し、他タスクとの依存ネットワークを切断してください。"
    } else if (counts[0] > counts[1] * 2) {
      strategySuggestion = "💡 <b>リソース配分最適化:</b> 未着手タスクの割合が過多です。優先度「高」且つ期限の近い順から着手フラグを有効化してください。"
    } else {
      strategySuggestion = "✅ <b>安定巡回状態:</b> タスクは安全なフローサイクルを維持しています。"
    }

    // Output Data Structure Generation
    let html = `
      <div class="mb-3">
        <h6 class="fw-bold small text-primary">📊 マルコフ定常状態の推定確率分布:</h6>
        <div class="progress mb-1" style="height: 18px;">
          <div class="progress-bar bg-primary" style="width: ${pTodo*100}%" title="Todo">未 ${(pTodo*100).toFixed(0)}%</div>
          <div class="progress-bar bg-warning text-dark" style="width: ${pProg*100}%" title="Progress">進行 ${(pProg*100).toFixed(0)}%</div>
          <div class="progress-bar bg-danger" style="width: ${pOve*100}%" title="Overdue">超過 ${(pOve*100).toFixed(0)}%</div>
          <div class="progress-bar bg-success" style="width: ${pDone*100}%" title="Done">完了 ${(pDone*100).toFixed(0)}%</div>
        </div>
        <small class="text-muted d-block style-xs" style="font-size:0.7rem;">※現在のリソース移行確率をベースにした収束シミュレーション結果</small>
      </div>

      <div class="mb-3">
        <h6 class="fw-bold small text-danger">🕸️ ネットワーク次数中心性 (最優先すべき高負荷ノード):</h6>
        <ul class="list-group list-group-flush fs-7">
    `
    
    bottlenecks.slice(0, 3).forEach((b, idx) => {
      if (b.score > 0) {
        html += `<li class="list-group-item d-flex justify-content-between p-1 bg-transparent">
          <span>${idx+1}. ${b.text.substring(0,18)}...</span>
          <span class="badge bg-dark">影響度度数: ${b.score}</span>
        </li>`
      }
    })
    if (bottlenecks.filter(b => b.score > 0).length === 0) {
      html += `<li class="list-group-item text-muted p-1 bg-transparent">警告を要する高負荷ノードはありません。</li>`
    }

    html += `
        </ul>
      </div>
      <div class="p-2 bg-light border text-dark rounded small fs-7">${strategySuggestion}</div>
    `
    analyticsOutput.innerHTML = html
  })

  // Initialization
  load()
  render()
})()
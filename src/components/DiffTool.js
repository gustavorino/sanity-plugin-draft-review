import {omit} from 'lodash'
import sanityClient from 'part:@sanity/base/client'
import {getDraftId, getPublishedId} from 'part:@sanity/base/util/draft-utils'
import Button from 'part:@sanity/components/buttons/anchor'
import {default as React, PureComponent} from 'react'
import {of as observableOf} from 'rxjs'
import {catchError, map} from 'rxjs/operators'
import Diff from './Diff'

const clean = obj => {
  const {_id, _rev, _updatedAt, _createdAt, _type, ...rest} = obj
  return rest
}

export default class DiffTool extends PureComponent {
  state = {drafts: [], docs: [], loading: true, loadingMap: {}}

  constructor() {
    super()
    this.loadData()
  }

  loadData = () => {
    this.setState({drafts: [], docs: [], loading: true})
    sanityClient.fetch(`*[_id in path("drafts.**")]`).then(drafts => {
      this.setState({drafts})
      this.fetchDocs(drafts)
    })
  }

  fetchDocs(drafts) {
    const ids = drafts.map(draft => draft._id.replace('drafts.', ''))

    sanityClient.fetch(`*[_id in $ids]`, {ids}).then(data => {
      this.setState({docs: data, loading: false})
    })
  }

  approve(draft, published, isNew) {
    const tx = sanityClient.observable.transaction()
    const documentId = draft._id

    const newLoadingMap = {...this.state.loadingMap, [documentId]: true}
    this.setState({loadingMap: newLoadingMap})

    if (isNew) {
      tx.create({
        ...omit(draft, '_updatedAt'),
        _id: getPublishedId(documentId)
      })
    } else {
      tx.patch(getPublishedId(documentId), {
        unset: ['_reserved_prop_'],
        ifRevisionID: published._rev
      }).createOrReplace({
        ...omit(draft, '_updatedAt'),
        _id: getPublishedId(documentId)
      })
    }

    tx.delete(getDraftId(documentId))

    tx.commit()
      .pipe(
        map(result => ({
          type: 'success',
          result: result
        })),
        catchError(error =>
          observableOf({
            type: 'error',
            message: 'An error occurred while attempting to publishing document',
            error
          })
        )
      )
      .subscribe({
        next: result => {
          this.setState({
            transactionResult: result
          })
        },
        complete: () => {
          const newLoadingMap = {...this.state.loadingMap, [documentId]: false}
          this.setState({loadingMap: newLoadingMap})

          this.loadData()
        }
      })
  }
  reject(draft, isNew) {
    const documentId = draft._id
    const newLoadingMap = {...this.state.loadingMap, [documentId]: true}
    this.setState({loadingMap: newLoadingMap}, () => {
      sanityClient.delete(draft._id).then(() => {
        const newLoadingMap = {...this.state.loadingMap, [documentId]: false}
        this.setState({loadingMap: newLoadingMap})
        this.loadData()
      })
    })
  }

  getMatchingDoc(draftId, docs) {
    return (
      docs.filter(doc => {
        return draftId.endsWith(doc._id)
      })[0] || null
    )
  }
  renderDiffs() {
    return this.state.drafts.map((draft, i) => {
      const newDoc = {}
      const doc = this.getMatchingDoc(draft._id, this.state.docs) || newDoc
      const isNew = doc === newDoc

      return (
        <div key={i}>
          {isNew && (
            <h1>
              {draft._type}
              <span style={{color: 'green', verticalAlign: 'middle', fontSize: '0.5em'}}>
                {' '}
                (new)
              </span>
            </h1>
          )}
          {!isNew && <h1>{draft._type}</h1>}
          <Diff inputA={clean(doc)} inputB={clean(draft)} type="json" />
          <Button
            loading={this.state.loadingMap[draft._id]}
            onClick={this.approve.bind(this, draft, doc, isNew)}
          >
            Approve
          </Button>
          <Button
            loading={this.state.loadingMap[draft._id]}
            onClick={this.reject.bind(this, draft, isNew)}
          >
            Reject
          </Button>
          <hr style={{marginTop: '1em'}}></hr>
        </div>
      )
    })
  }

  renderOptions() {
    if (this.state.loading) {
      return <h2>Loading...</h2>
    }
    if (this.state.drafts.length === 0) {
      return <h2>Draft list is empty</h2>
    }
    return <div>{this.renderDiffs()}</div>
  }
  render() {
    return <div style={{margin: 20}}>{this.renderOptions()}</div>
  }
}
